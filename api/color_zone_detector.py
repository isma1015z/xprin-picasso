"""
color_zone_detector.py  —  XPRIN-Picasso  (v8 — pipeline simple)
-----------------------------------------------------------------
Pipeline directo inspirado en el enfoque del editor externo:

  1. Gaussian blur          suaviza bordes antes de cuantizar
  2. K-means                agrupa píxeles por color dominante
  3. Por cada color:
       - Máscara binaria
       - Componentes conectados (cc)
       - findContours + approxPolyDP (equivalente al RDP del editor JS)
  4. Devolver capas JSON

Sin tiling, sin Canny, sin bilateral, sin CLAHE, sin subpixel.
La simplicidad es la robustez.

Uso CLI:
    python color_zone_detector.py imagen.png
    python color_zone_detector.py imagen.png --colores 8
    python color_zone_detector.py imagen.png --sigma 2.0
    python color_zone_detector.py imagen.png --debug
"""

import cv2
import numpy as np
import json
import os
import argparse
import uuid
from datetime import datetime, timezone
from typing import Optional

# ── Defaults ──────────────────────────────────────────────────────────────────
DEFAULT_N_COLORES   = 0       # 0 = automático
DEFAULT_MIN_AREA    = 400     # px² mínimo por zona
DEFAULT_GAUSS_SIGMA = 1.5     # suavizado pre-cuantización
DEFAULT_EPSILON_PCT = 0.002   # tolerancia RDP (fracción del perímetro)
DEFAULT_DELTA_E     = 12.0    # umbral fusión de capas similares
MAX_K               = 14      # máximo de colores auto


# ═══════════════════════════════════════════════════════════════════════════════
# UTILS
# ═══════════════════════════════════════════════════════════════════════════════

def bgr_to_lab(b, g, r):
    px  = np.array([[[int(b), int(g), int(r)]]], dtype=np.uint8)
    lab = cv2.cvtColor(px, cv2.COLOR_BGR2LAB)
    return lab[0, 0].astype(float)

def delta_e(a, b):
    return float(np.linalg.norm(np.array(a, dtype=float) - np.array(b, dtype=float)))

def bgr_to_hex(b, g, r):
    return f"#{int(r):02x}{int(g):02x}{int(b):02x}"

def auto_k(bgr_blur, mask, techo=MAX_K):
    """Estima K contando colores únicos tras cuantización 5-bit."""
    q  = (bgr_blur[mask].astype(np.int32) // 8) * 8
    n  = len(np.unique(q.view(np.dtype((np.void, q.dtype.itemsize * 3)))))
    return max(3, min(n, techo))


# ═══════════════════════════════════════════════════════════════════════════════
# PIPELINE PRINCIPAL
# ═══════════════════════════════════════════════════════════════════════════════

def detectar_capas(
    imagen_path: str,
    n_colores:   int   = DEFAULT_N_COLORES,
    min_area:    int   = DEFAULT_MIN_AREA,
    gauss_sigma: float = DEFAULT_GAUSS_SIGMA,
    epsilon_pct: float = DEFAULT_EPSILON_PCT,
    delta_e_umbral: float = DEFAULT_DELTA_E,
    debug:       bool  = False,
) -> dict:

    # ── Cargar imagen ──────────────────────────────────────────────────────────
    img = cv2.imread(imagen_path, cv2.IMREAD_UNCHANGED)
    if img is None:
        raise FileNotFoundError(f"No se puede abrir: {imagen_path}")

    # Normalizar a BGRA
    if img.ndim == 2:
        img = cv2.cvtColor(img, cv2.COLOR_GRAY2BGRA)
    elif img.shape[2] == 3:
        img = np.dstack([img, np.full(img.shape[:2], 255, np.uint8)])

    alto, ancho = img.shape[:2]
    bgr   = img[:, :, :3]
    alpha = img[:, :, 3]
    mask  = alpha > 10              # píxeles válidos (no fondo)

    print(f"  Imagen: {ancho}×{alto}px  |  píxeles válidos: {mask.sum()}")

    # ── 1. Gaussian blur — suaviza bordes antes de cuantizar ──────────────────
    ksize = max(3, int(gauss_sigma * 6 + 1) | 1)   # impar
    bgr_blur = cv2.GaussianBlur(bgr, (ksize, ksize), gauss_sigma)
    bgr_blur[~mask] = 0

    print(f"  Gaussian sigma={gauss_sigma}  kernel={ksize}×{ksize}")

    # ── 2. K-means color quantization ─────────────────────────────────────────
    k = n_colores if n_colores > 0 else auto_k(bgr_blur, mask)
    print(f"  K={k} colores")

    pix_val = bgr_blur[mask].astype(np.float32)
    _, labels, centros = cv2.kmeans(
        pix_val, k, None,
        (cv2.TERM_CRITERIA_EPS + cv2.TERM_CRITERIA_MAX_ITER, 30, 0.5),
        5, cv2.KMEANS_PP_CENTERS
    )
    centros = np.uint8(centros)

    # Reconstruir mapa de etiquetas completo
    label_map = np.full(alto * ancho, -1, dtype=np.int32)
    label_map[mask.ravel()] = labels.ravel()
    label_map = label_map.reshape(alto, ancho)

    # ── 3. Contornos por color ─────────────────────────────────────────────────
    zonas = []

    for ki in range(k):
        mascara = ((label_map == ki) & mask).astype(np.uint8) * 255

        # Pequeño cierre morfológico para rellenar gaps de 1px
        mascara = cv2.morphologyEx(
            mascara, cv2.MORPH_CLOSE, np.ones((3, 3), np.uint8)
        )

        # Componentes conectados — cada isla es una zona separada
        n_cc, cc_labels, stats, _ = cv2.connectedComponentsWithStats(
            mascara, connectivity=8
        )

        for cc_id in range(1, n_cc):
            area = int(stats[cc_id, cv2.CC_STAT_AREA])
            if area < min_area:
                continue

            # Máscara de esta componente
            cc_mask = (cc_labels == cc_id).astype(np.uint8) * 255

            # findContours — RETR_EXTERNAL: solo contorno exterior
            contornos, _ = cv2.findContours(
                cc_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE
            )
            if not contornos:
                continue

            # El contorno más grande de esta componente
            contorno = max(contornos, key=cv2.contourArea)
            if cv2.contourArea(contorno) < min_area:
                continue

            # approxPolyDP — equivalente al RDP del editor JS
            epsilon = epsilon_pct * cv2.arcLength(contorno, True)
            approx  = cv2.approxPolyDP(contorno, epsilon, True)
            if len(approx) < 3:
                continue

            # Convertir a forma PS (flip Y)
            puntos = [(float(p[0][0]), float(p[0][1])) for p in approx]
            forma  = [
                {"tipo": "moveto" if i == 0 else "lineto",
                 "x": round(x, 2),
                 "y": round(float(alto) - y, 2)}
                for i, (x, y) in enumerate(puntos)
            ]
            forma.append({"tipo": "closepath"})

            x_b, y_b, w_b, h_b = cv2.boundingRect(contorno)
            b_v, g_v, r_v = (int(c) for c in centros[ki])

            zonas.append({
                "_ki":     ki,
                "_color":  (b_v, g_v, r_v),
                "id":      f"zona_{str(uuid.uuid4())[:8]}",
                "area_px": area,
                "bbox":    {"x": x_b, "y": y_b, "w": w_b, "h": h_b},
                "forma":   forma,
                "n_puntos": len(puntos),
            })

    print(f"  Zonas brutas: {len(zonas)}")

    # ── 4. Agrupar zonas en capas por color similar (Delta-E) ─────────────────
    labs   = [bgr_to_lab(*z["_color"]) for z in zonas]
    n      = len(zonas)
    asig   = [-1] * n
    grupos = []

    for i in range(n):
        if asig[i] != -1:
            continue
        g = [i]; asig[i] = len(grupos)
        for j in range(i + 1, n):
            if asig[j] != -1:
                continue
            if delta_e(labs[i], labs[j]) <= delta_e_umbral:
                g.append(j); asig[j] = len(grupos)
        grupos.append(g)

    capas = []
    for g in grupos:
        dom      = max(g, key=lambda i: zonas[i]["area_px"])
        b_v, g_v, r_v = zonas[dom]["_color"]
        hex_col  = bgr_to_hex(b_v, g_v, r_v)
        area_tot = sum(zonas[i]["area_px"] for i in g)

        capas.append({
            "id":       f"capa_{str(uuid.uuid4())[:8]}",
            "nombre":   f"Color {hex_col}",
            "color":    hex_col,
            "spot":     None,
            "visible":  True,
            "opacidad": 1.0,
            "area_px":  area_tot,
            "zonas": [{
                "id":       zonas[i]["id"],
                "area_px":  zonas[i]["area_px"],
                "bbox":     zonas[i]["bbox"],
                "forma":    zonas[i]["forma"],
                "n_puntos": zonas[i]["n_puntos"],
            } for i in g],
        })

    capas.sort(key=lambda c: c["area_px"], reverse=True)
    print(f"  Capas finales: {len(capas)}")

    # ── Debug: dibujar paths sobre la imagen ──────────────────────────────────
    if debug:
        dbg = bgr.copy()
        for z in zonas:
            pts = [(c["x"], alto - c["y"]) for c in z["forma"]
                   if c["tipo"] in ("moveto", "lineto")]
            if len(pts) >= 3:
                b_v, g_v, r_v = z["_color"]
                cv2.polylines(dbg,
                    [np.array(pts, dtype=np.int32).reshape(-1, 1, 2)],
                    True, (b_v, g_v, r_v), 1)
        out = os.path.splitext(imagen_path)[0] + "_debug.png"
        cv2.imwrite(out, dbg)
        print(f"  Debug: {out}")

    nombre_archivo = os.path.basename(imagen_path)
    return {
        "version":    "1.0",
        "id":         f"proj_{str(uuid.uuid4())[:8]}",
        "nombre":     os.path.splitext(nombre_archivo)[0],
        "creadoEn":   datetime.now(timezone.utc).isoformat(),
        "documento":  {"ancho": ancho, "alto": alto, "unidad": "px", "resolucion": 72},
        "imagenBase": {"ruta": nombre_archivo, "ancho": ancho, "alto": alto},
        "metadatos":  {
            "metodo":      "gaussian+kmeans+contours",
            "gauss_sigma": gauss_sigma,
            "k_colores":   k,
            "epsilon_pct": epsilon_pct,
            "delta_e":     delta_e_umbral,
            "n_capas":     len(capas),
        },
        "capas": capas,
    }


# ═══════════════════════════════════════════════════════════════════════════════
# ENTRADA DESDE FASTAPI
# ═══════════════════════════════════════════════════════════════════════════════

def detectar_desde_bytes(
    imagen_bytes:     bytes,
    nombre:           str   = "imagen",
    n_colores:        int   = DEFAULT_N_COLORES,
    min_area:         int   = DEFAULT_MIN_AREA,
    gauss_sigma:      float = DEFAULT_GAUSS_SIGMA,
    epsilon_pct:      float = DEFAULT_EPSILON_PCT,
    delta_e_umbral:   float = DEFAULT_DELTA_E,
    imagen_save_path: Optional[str] = None,
) -> dict:
    import tempfile
    arr = np.frombuffer(imagen_bytes, np.uint8)
    img = cv2.imdecode(arr, cv2.IMREAD_UNCHANGED)
    if img is None:
        raise ValueError("No se pudo decodificar la imagen")

    if imagen_save_path:
        cv2.imwrite(imagen_save_path, img)
        tmp_path   = imagen_save_path
        delete_tmp = False
    else:
        with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as tmp:
            cv2.imwrite(tmp.name, img)
            tmp_path = tmp.name
        delete_tmp = True

    try:
        r = detectar_capas(
            tmp_path,
            n_colores=n_colores, min_area=min_area,
            gauss_sigma=gauss_sigma, epsilon_pct=epsilon_pct,
            delta_e_umbral=delta_e_umbral,
        )
        r["imagenBase"]["ruta"] = nombre
        return r
    finally:
        if delete_tmp:
            os.unlink(tmp_path)


# ═══════════════════════════════════════════════════════════════════════════════
# CLI
# ═══════════════════════════════════════════════════════════════════════════════

def main():
    parser = argparse.ArgumentParser(
        description="XPRIN-Picasso v8 — gaussian + kmeans + contours"
    )
    parser.add_argument("imagen")
    parser.add_argument("--colores", type=int,   default=DEFAULT_N_COLORES,
                        help="Nº de colores (0=auto)")
    parser.add_argument("--min",     type=int,   default=DEFAULT_MIN_AREA,
                        help="Área mínima en px²")
    parser.add_argument("--sigma",   type=float, default=DEFAULT_GAUSS_SIGMA,
                        help="Sigma gaussiano (default 1.5)")
    parser.add_argument("--eps",     type=float, default=DEFAULT_EPSILON_PCT,
                        help="Tolerancia RDP como fracción del perímetro")
    parser.add_argument("--delta-e", type=float, default=DEFAULT_DELTA_E,
                        help="Umbral fusión de capas similares")
    parser.add_argument("--debug",   action="store_true")
    parser.add_argument("--output",  type=str,   default=None)
    args = parser.parse_args()

    print(f"\n{'='*52}")
    print(f"  XPRIN-Picasso v8  —  gaussian + kmeans + contours")
    print(f"{'='*52}\n")

    resultado = detectar_capas(
        args.imagen,
        n_colores=args.colores, min_area=args.min,
        gauss_sigma=args.sigma, epsilon_pct=args.eps,
        delta_e_umbral=getattr(args, "delta_e"),
        debug=args.debug,
    )

    json_path = args.output or os.path.splitext(args.imagen)[0] + "_capas.json"
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(resultado, f, ensure_ascii=False, indent=2)

    print(f"\n[OK] {json_path}")
    print(f"\n  {'Color':<14}  {'Área':>10}  {'Zonas':>6}")
    print(f"  {'-'*34}")
    for c in resultado["capas"]:
        print(f"  {c['color']:<14}  {c['area_px']:>10}px  {len(c['zonas']):>6}")


if __name__ == "__main__":
    main()
