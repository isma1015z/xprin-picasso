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
""""""

import cv2
import numpy as np
import json
import os
import argparse
import uuid
import math
from datetime import datetime, timezone
from typing import Optional

# ── Defaults ──────────────────────────────────────────────────────────────────
DEFAULT_N_COLORES   = 0       # 0 = automático
DEFAULT_MIN_AREA    = 400     # px² mínimo por zona
DEFAULT_GAUSS_SIGMA = 1.1     # suavizado pre-cuantización (menos agresivo)
DEFAULT_EPSILON_PCT = 0.00045 # tolerancia RDP (fracción del perímetro)
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
    if mask is None or int(mask.sum()) == 0:
        return 1
    q  = (bgr_blur[mask].astype(np.int32) // 8) * 8
    if q.size == 0:
        return 1
    n  = len(np.unique(q.view(np.dtype((np.void, q.dtype.itemsize * 3)))))
    return max(3, min(n, techo))

def elegir_prefiltro_auto(bgr: np.ndarray, mask: np.ndarray) -> str:
    """Heurística simple: logos/bordes duros -> median; foto/ruido -> bilateral."""
    roi = bgr[mask]
    if roi.size == 0:
        return "median"
    # Variación de color global (fotos suelen tener más rango tonal).
    color_std = float(np.std(roi.reshape(-1, 3)))
    gray = cv2.cvtColor(bgr, cv2.COLOR_BGR2GRAY)
    edges = cv2.Canny(gray, 80, 180)
    edge_density = float((edges[mask] > 0).sum()) / float(mask.sum() + 1e-6)
    if color_std > 42.0 or edge_density > 0.11:
        return "bilateral"
    return "median"

def aplicar_prefiltro(
    bgr: np.ndarray,
    mask: np.ndarray,
    gauss_sigma: float,
    filtro: str = "auto",
) -> tuple[np.ndarray, str]:
    modo = filtro
    if modo == "auto":
        modo = elegir_prefiltro_auto(bgr, mask)

    if modo == "bilateral":
        d = max(5, int(gauss_sigma * 8 + 1) | 1)
        out = cv2.bilateralFilter(bgr, d, 35, 35)
    elif modo == "gaussian":
        ksize = max(3, int(gauss_sigma * 6 + 1) | 1)
        out = cv2.GaussianBlur(bgr, (ksize, ksize), gauss_sigma)
    else:
        # median preserva mejor esquinas duras en logos.
        ksize = max(3, int(gauss_sigma * 6 + 1) | 1)
        out = cv2.medianBlur(bgr, ksize)

    out[~mask] = 0
    return out, modo

def min_area_adaptativa(alto: int, ancho: int, min_area_usuario: int) -> int:
    """Reduce el umbral en imágenes medianas para no perder detalles finos."""
    area_img = max(1, int(alto * ancho))
    # Escala con tamaño de imagen, pero nunca supera el valor usuario.
    auto = int(area_img * 0.00018) + 20
    auto = max(24, auto)
    return max(12, min(int(min_area_usuario), auto))

def kernel_cierre_adaptativo(mascara: np.ndarray, edges: np.ndarray) -> int:
    pix = int((mascara > 0).sum())
    if pix <= 0:
        return 1
    dens = float((edges[mascara > 0] > 0).sum()) / float(pix)
    # Borde complejo: no cerrar demasiado para no engordar ni romper trazos finos.
    if dens > 0.12:
        return 1
    if dens > 0.06:
        return 2
    return 2

def contorno_a_puntos(contorno: np.ndarray, area_hint: float, epsilon_pct: float) -> Optional[np.ndarray]:
    """Convierte contorno OpenCV a puntos de polígono, con ajuste adaptativo."""
    perimetro = max(1.0, cv2.arcLength(contorno, True))
    area_c = max(1.0, float(cv2.contourArea(contorno)))
    circularidad = float(4.0 * math.pi * area_c / (perimetro * perimetro))

    factor = 1.0
    if area_hint < 2000:
        factor *= 0.75
    if area_hint < 1000:
        factor *= 0.80
    if circularidad < 0.20:
        factor *= 0.70
    elif circularidad > 0.60:
        factor *= 0.60
    if circularidad > 0.78:
        factor *= 0.80

    # Mantener más detalle en bordes finos/antialias.
    epsilon = max(0.08, epsilon_pct * factor * perimetro)
    approx = cv2.approxPolyDP(contorno, epsilon, True)
    if len(approx) < 3:
        return None

    # Sin "snap" a elipse: priorizamos fidelidad geométrica del contorno real.
    puntos_np = approx.reshape(-1, 2)
    if puntos_np.shape[0] < 3:
        return None
    return puntos_np


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
    filtro:      str   = "auto",
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
    # Umbral bajo para conservar borde suave tras remove_bg (antialias en alpha).
    mask  = alpha > 3               # píxeles válidos (no fondo)

    # Fallback robusto: algunas imágenes llegan totalmente transparentes.
    # Si no hay píxeles válidos por alpha, usamos todos los píxeles.
    if int(mask.sum()) == 0:
        mask = np.ones((alto, ancho), dtype=bool)

    print(f"  Imagen: {ancho}×{alto}px  |  píxeles válidos: {mask.sum()}")

    # ── 1. Prefiltro (auto) antes de cuantizar ────────────────────────────────
    bgr_blur, filtro_usado = aplicar_prefiltro(bgr, mask, gauss_sigma, filtro=filtro)
    print(f"  Prefiltro={filtro_usado} sigma={gauss_sigma}")

    # ── 2. K-means color quantization ─────────────────────────────────────────
    k = n_colores if n_colores > 0 else auto_k(bgr_blur, mask)
    pix_val = bgr_blur[mask].astype(np.float32)
    if pix_val.size == 0:
        raise ValueError("No hay píxeles válidos para detectar zonas de color.")
    max_k = max(1, int(pix_val.shape[0]))
    k = max(1, min(int(k), max_k))
    print(f"  K={k} colores")

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
    min_area_eff = min_area_adaptativa(alto, ancho, min_area)
    min_area_rescate = max(10, int(min_area_eff * 0.28))
    edges_ref = cv2.Canny(cv2.cvtColor(bgr_blur, cv2.COLOR_BGR2GRAY), 70, 170)
    print(f"  min_area efectivo={min_area_eff}  rescate={min_area_rescate}")

    for ki in range(k):
        mascara = ((label_map == ki) & mask).astype(np.uint8) * 255

        kclose = kernel_cierre_adaptativo(mascara, edges_ref)
        if kclose > 1:
            mascara = cv2.morphologyEx(
                mascara, cv2.MORPH_CLOSE, np.ones((kclose, kclose), np.uint8)
            )

        # Componentes conectados — cada isla es una zona separada
        n_cc, cc_labels, stats, _ = cv2.connectedComponentsWithStats(
            mascara, connectivity=8
        )
        comps_grandes = []
        comps_peq = []

        for cc_id in range(1, n_cc):
            area = int(stats[cc_id, cv2.CC_STAT_AREA])
            if area >= min_area_eff:
                comps_grandes.append(cc_id)
            elif area >= min_area_rescate:
                comps_peq.append(cc_id)

        comps_final = set(comps_grandes)
        if comps_peq:
            union_grandes = np.zeros_like(mascara, dtype=np.uint8)
            for cc_id in comps_grandes:
                union_grandes[cc_labels == cc_id] = 255

            if int(union_grandes.sum()) > 0:
                radio = 2 if kclose <= 2 else 3
                cerca_grandes = cv2.dilate(
                    union_grandes, np.ones((radio * 2 + 1, radio * 2 + 1), np.uint8)
                )
                for cc_id in comps_peq:
                    cc_mask_bin = (cc_labels == cc_id)
                    if np.any(cerca_grandes[cc_mask_bin] > 0):
                        comps_final.add(cc_id)
            else:
                # Si no hay grandes, conservar pequeñas relevantes para no perder detalles.
                comps_peq_sorted = sorted(
                    comps_peq,
                    key=lambda idx: int(stats[idx, cv2.CC_STAT_AREA]),
                    reverse=True,
                )
                for cc_id in comps_peq_sorted[:8]:
                    area = int(stats[cc_id, cv2.CC_STAT_AREA])
                    if area >= max(min_area_rescate, int(min_area_eff * 0.45)):
                        comps_final.add(cc_id)

        for cc_id in sorted(comps_final):
            area = int(stats[cc_id, cv2.CC_STAT_AREA])

            # Máscara de esta componente
            cc_mask = (cc_labels == cc_id).astype(np.uint8) * 255

            # findContours con jerarquía: contorno exterior + agujeros internos
            contornos, jerarquia = cv2.findContours(
                cc_mask, cv2.RETR_CCOMP, cv2.CHAIN_APPROX_NONE
            )
            if not contornos or jerarquia is None:
                continue

            h = jerarquia[0]
            exteriores = [idx for idx, node in enumerate(h) if node[3] == -1]

            for idx_ext in exteriores:
                contorno_ext = contornos[idx_ext]
                contour_min_area = max(6.0, float(min_area_rescate) * 0.35)
                if cv2.contourArea(contorno_ext) < contour_min_area:
                    continue

                puntos_ext = contorno_a_puntos(
                    contorno_ext,
                    area_hint=max(float(area), float(cv2.contourArea(contorno_ext))),
                    epsilon_pct=epsilon_pct,
                )
                if puntos_ext is None:
                    continue

                forma = []
                puntos = [(float(p[0]), float(p[1])) for p in puntos_ext]
                forma.extend(
                    {"tipo": "moveto" if i == 0 else "lineto",
                     "x": round(x, 2),
                     "y": round(float(alto) - y, 2)}
                    for i, (x, y) in enumerate(puntos)
                )
                forma.append({"tipo": "closepath"})
                n_puntos_total = len(puntos)

                # Hijos directos = agujeros del exterior
                hijos = [j for j, node in enumerate(h) if node[3] == idx_ext]
                for idx_h in hijos:
                    ch = contornos[idx_h]
                    if cv2.contourArea(ch) < 6.0:
                        continue
                    puntos_h = contorno_a_puntos(
                        ch,
                        area_hint=float(cv2.contourArea(ch)),
                        epsilon_pct=epsilon_pct * 0.9,
                    )
                    if puntos_h is None:
                        continue
                    pts_h = [(float(p[0]), float(p[1])) for p in puntos_h]
                    forma.extend(
                        {"tipo": "moveto" if i == 0 else "lineto",
                         "x": round(x, 2),
                         "y": round(float(alto) - y, 2)}
                        for i, (x, y) in enumerate(pts_h)
                    )
                    forma.append({"tipo": "closepath"})
                    n_puntos_total += len(pts_h)

                x_b, y_b, w_b, h_b = cv2.boundingRect(contorno_ext)
                b_v, g_v, r_v = (int(c) for c in centros[ki])

                zonas.append({
                    "_ki":      ki,
                    "_color":   (b_v, g_v, r_v),
                    "id":       f"zona_{str(uuid.uuid4())[:8]}",
                    "area_px":  area,
                    "bbox":     {"x": x_b, "y": y_b, "w": w_b, "h": h_b},
                    "forma":    forma,
                    "n_puntos": n_puntos_total,
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
            "metodo":      "prefilter+kmeans+contours",
            "prefiltro":   filtro_usado,
            "gauss_sigma": gauss_sigma,
            "k_colores":   k,
            "min_area_user": min_area,
            "min_area_eff": min_area_eff,
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
    filtro:           str   = "auto",
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
            filtro=filtro,
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
