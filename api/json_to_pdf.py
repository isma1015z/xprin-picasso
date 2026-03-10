"""
json_to_pdf.py  —  XPRIN-Picasso  (v4.3 — 300 DPI)
---------------------------------------------------------------
FIX v4.3:
  Salida siempre a 300 DPI:
  - Flag -r300 añadida al comando Ghostscript.
    pdfwrite con -r300 embebe los objetos vectoriales a 300 dpi y
    rasteriza cualquier contenido que no sea vectorial puro a esa
    resolución. Es el estándar de preimpresión para UV/serigrafía.
  - MAX_IMG_PX subido de 1200 a 2500 px.
    Razón: un documento de 503 pt ≈ 7 pulgadas; a 300 dpi necesita
    7 × 300 = 2100 px de origen para que la imagen no pierda calidad
    al rasterizar. Con 2500 px hay margen para documentos más grandes.

FIX v4.2:
  /typecheck in --concat--
    CAUSA: "503 0 0 600 0 0 concat" — concat espera array [a b c d e f].
    FIX:   reemplazado por "503 600 scale".

MANTENIDOS de v4.1:
  - DeviceGray como alternate space (compatible GS 10.x Windows)
  - true setoverprint una vez por canal, fuera de gsave de paths
  - Colorspaces definidos una vez al inicio (/W1cs /W2cs /TEXTUREcs)
  - Imagen embebida como JPEG/DCTDecode (no raw hex)
  - Opción embed_imagen=False para PDF solo spots (carga rápida RIP)
  - Un gsave por canal, no por zona
"""

import io
import json
import os
import sys
import shutil
import argparse
import subprocess
from datetime import datetime, timezone

try:
    from PIL import Image
    HAS_PILLOW = True
except ImportError:
    HAS_PILLOW = False


# ═══════════════════════════════════════════════════════════════════════════════
# CONFIGURACION
# ═══════════════════════════════════════════════════════════════════════════════

SPOTS_ORDEN = ["w1", "w2", "texture"]

SPOT_NOMBRE_PDF = {
    "w1":      "W1",
    "w2":      "W2",
    "texture": "TEXTURE",
}

SPOT_CHANNELS = {
    "w1":      {"nombre": "W1",      "preview_rgb": (0.75, 0.75, 0.80)},
    "w2":      {"nombre": "W2",      "preview_rgb": (0.60, 0.65, 0.90)},
    "texture": {"nombre": "TEXTURE", "preview_rgb": (0.95, 0.80, 0.30)},
}

# v4.3: subido de 1200 a 2500 para que la imagen embebida tenga suficiente
# resolución de origen al rasterizar a 300 dpi.
MAX_IMG_PX = 2500

# Resolución de salida en DPI (usado en la flag -r de Ghostscript)
OUTPUT_DPI = 300


# ═══════════════════════════════════════════════════════════════════════════════
# COLORES
# ═══════════════════════════════════════════════════════════════════════════════

def _hex_to_rgb(color: str | None) -> tuple[float, float, float]:
    if not color:
        return (0.0, 0.0, 0.0)
    c = color.strip().lower().lstrip("#")
    if len(c) == 3:
        c = "".join(ch*2 for ch in c)
    if len(c) != 6:
        return (0.0, 0.0, 0.0)
    try:
        return (int(c[0:2],16)/255.0, int(c[2:4],16)/255.0, int(c[4:6],16)/255.0)
    except ValueError:
        return (0.0, 0.0, 0.0)


def _hex_to_cmyk(color: str | None) -> tuple[float, float, float, float]:
    if color:
        c = color.strip().lower()
        if c in ("#fff", "#ffffff"):                return (0.0, 0.0, 0.0, 0.0)
        if c in ("#000", "#000000"):                return (0.0, 0.0, 0.0, 1.0)
        if c in ("#00529f", "#003d7c", "#00468b"):  return (1.0, 0.49, 0.0, 0.38)
        if c in ("#ee324e", "#d00020", "#cc0022"):  return (0.0, 0.79, 0.67, 0.07)
        if c in ("#febe10", "#ffcc00", "#f5c518"):  return (0.0, 0.25, 0.94, 0.0)
        if c in ("#6f1f3a", "#7b1f3e", "#8b1f42"):  return (0.0, 0.72, 0.47, 0.57)
        if c in ("#0d2240", "#0a1f3c", "#0e2244"):  return (0.96, 0.71, 0.0, 0.75)
    r, g, b = _hex_to_rgb(color)
    k = 1.0 - max(r, g, b)
    if k >= 0.999:
        return (0.0, 0.0, 0.0, 1.0)
    d = 1.0 - k
    return (
        max(0.0, min(1.0, (1.0-r-k)/d)),
        max(0.0, min(1.0, (1.0-g-k)/d)),
        max(0.0, min(1.0, (1.0-b-k)/d)),
        max(0.0, min(1.0, k)),
    )


# ═══════════════════════════════════════════════════════════════════════════════
# RECURSOS SPOT — definidos UNA VEZ al inicio del documento
# Alternate space: DeviceGray — compatible GS 10.x Windows y todos los RIPs.
# El RIP usa el NOMBRE del canal (W1/W2/TEXTURE) para las separaciones.
# ═══════════════════════════════════════════════════════════════════════════════

def _definir_recursos_spot(preview: bool = False) -> list[str]:
    lines = [
        "% Colorspaces canales spot UV (DeviceGray alternate — GS 10.x Windows)",
        "",
    ]
    for key in SPOTS_ORDEN:
        ch  = SPOT_CHANNELS[key]
        var = f"/{ch['nombre']}cs"
        if preview:
            r, g, b = ch["preview_rgb"]
            lines.append(f"{var} [/DeviceRGB] def   % preview {r:.2f} {g:.2f} {b:.2f}")
        else:
            lines.append(
                f"{var} [/Separation ({ch['nombre']}) /DeviceGray {{1 exch sub}}] def"
            )
    lines.append("")
    return lines


# ═══════════════════════════════════════════════════════════════════════════════
# PATHS
# ═══════════════════════════════════════════════════════════════════════════════

def _forma_a_ps(forma: list) -> str:
    lineas = []
    for cmd in forma:
        t = cmd.get("tipo", "")
        if t == "moveto":
            lineas.append(f"  {cmd['x']:.3f} {cmd['y']:.3f} m")
        elif t == "lineto":
            lineas.append(f"  {cmd['x']:.3f} {cmd['y']:.3f} l")
        elif t == "curveto":
            lineas.append(
                f"  {cmd['x1']:.3f} {cmd['y1']:.3f}"
                f"  {cmd['x2']:.3f} {cmd['y2']:.3f}"
                f"  {cmd['x']:.3f}  {cmd['y']:.3f} c"
            )
        elif t == "closepath":
            lineas.append("  h")
    return "\n".join(lineas)


# ═══════════════════════════════════════════════════════════════════════════════
# IMAGEN BASE — embebida como JPEG/DCTDecode
# ═══════════════════════════════════════════════════════════════════════════════

def _abrir_sobre_blanco(imagen_path: str) -> "Image.Image":
    img = Image.open(imagen_path)
    if img.mode == "P":
        img = img.convert("RGBA")
    elif img.mode not in ("RGBA", "RGB", "LA", "L"):
        img = img.convert("RGBA")
    if img.mode in ("RGBA", "LA"):
        fondo = Image.new("RGB", img.size, (255, 255, 255))
        if img.mode == "LA":
            img = img.convert("RGBA")
        fondo.paste(img, mask=img.split()[3])
        return fondo
    return img.convert("RGB")


def _imagen_a_ps_bloque(imagen_path: str, ancho_doc: int, alto_doc: int) -> list[str]:
    if not HAS_PILLOW:
        return ["% [AVISO] Pillow no instalado — imagen omitida", ""]
    if not os.path.isfile(imagen_path):
        return [f"% [AVISO] Imagen no encontrada: {imagen_path}", ""]

    img = _abrir_sobre_blanco(imagen_path)
    w, h = img.size
    if w > MAX_IMG_PX or h > MAX_IMG_PX:
        ratio = min(MAX_IMG_PX / w, MAX_IMG_PX / h)
        img = img.resize((int(w * ratio), int(h * ratio)), Image.LANCZOS)

    iw, ih = img.size

    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=90, optimize=True)
    jpeg_bytes = buf.getvalue()
    hex_data   = jpeg_bytes.hex().upper()
    hex_lines  = [hex_data[i:i+78] for i in range(0, len(hex_data), 78)]

    return [
        "% Imagen base (JPEG embebido / DCTDecode)",
        f"% {iw}x{ih}px | {len(jpeg_bytes)//1024}KB",
        "q",
        f"  {ancho_doc} {alto_doc} scale",
        "  /DeviceRGB setcolorspace",
        "  <<",
        "    /ImageType 1",
        f"    /Width {iw}",
        f"    /Height {ih}",
        "    /BitsPerComponent 8",
        "    /Decode [0 1 0 1 0 1]",
        f"    /ImageMatrix [{iw} 0 0 {-ih} 0 {ih}]",
        "    /DataSource currentfile /ASCIIHexDecode filter /DCTDecode filter",
        "  >>",
        "  image",
    ] + hex_lines + [">", "Q", ""]


# ═══════════════════════════════════════════════════════════════════════════════
# GENERADOR PS PRINCIPAL
# ═══════════════════════════════════════════════════════════════════════════════

def generar_postscript(
    datos: dict,
    imagen_path: str | None = None,
    preview: bool = False,
    embed_imagen: bool = True,
) -> str:
    doc    = datos["documento"]
    ancho  = int(doc["ancho"])
    alto   = int(doc["alto"])
    nombre = datos.get("nombre", "proyecto")
    capas  = datos.get("capas", [])

    por_spot: dict[str, list] = {s: [] for s in SPOTS_ORDEN}
    capas_cmyk = []
    for capa in capas:
        if not capa.get("visible", True):
            continue
        spot = capa.get("spot")
        if spot in por_spot:
            por_spot[spot].append(capa)
        else:
            capas_cmyk.append(capa)

    area_total = ancho * alto or 1
    cobertura = {
        s: round(100 * sum(c.get("area_px", 0) for c in lst) / area_total, 2)
        for s, lst in por_spot.items()
    }

    ts   = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    modo = "PREVIEW" if preview else "PREIMPRESION"

    lines = [
        "%!PS-Adobe-3.0",
        f"%%Title: XPRIN-Picasso -- {nombre}",
        f"%%Creator: json_to_pdf.py v4.3 ({modo}) {OUTPUT_DPI}dpi",
        f"%%CreationDate: {ts}",
        f"%%BoundingBox: 0 0 {ancho} {alto}",
        "%%DocumentColorSpaces: (W1) (W2) (TEXTURE)",
        "%%EndComments",
        "",
        "/m { moveto }    bind def",
        "/l { lineto }    bind def",
        "/c { curveto }   bind def",
        "/h { closepath } bind def",
        "/f { eofill }    bind def",
        "/q { gsave }     bind def",
        "/Q { grestore }  bind def",
        "",
        f"<< /PageSize [{ancho} {alto}] >> setpagedevice",
        "",
        "% Cobertura spots:",
    ]
    for spot in SPOTS_ORDEN:
        lines.append(
            f"%   {SPOT_NOMBRE_PDF[spot]}: {cobertura[spot]}%"
            f"  ({len(por_spot[spot])} capas)"
        )
    lines.append("")

    lines += _definir_recursos_spot(preview=preview)

    # ── Fondo blanco ──────────────────────────────────────────────────────────
    lines += [
        "% Fondo blanco",
        "q",
        "  /DeviceRGB setcolorspace",
        "  1 1 1 setcolor",
        f"  0 0 {ancho} {alto} rectfill",
        "Q",
        "",
    ]

    # ── Capas CMYK ────────────────────────────────────────────────────────────
    if capas_cmyk:
        lines += [
            f"% Capas CMYK ({len(capas_cmyk)})",
            "q",
            "  /DeviceCMYK setcolorspace",
            "",
        ]
        for capa in capas_cmyk:
            nombre_c = capa.get("nombre", "Capa").encode("ascii", "replace").decode()
            cv, mv, yv, kv = _hex_to_cmyk(capa.get("color"))
            lines.append(f"  % {nombre_c}  C{cv:.2f} M{mv:.2f} Y{yv:.2f} K{kv:.2f}")
            for zona in capa.get("zonas", []):
                forma_ps = _forma_a_ps(zona.get("forma", []))
                if not forma_ps.strip():
                    continue
                lines += [
                    f"  {cv:.4f} {mv:.4f} {yv:.4f} {kv:.4f} setcolor",
                    "  newpath",
                    forma_ps,
                    "  f",
                    "",
                ]
        lines += ["Q", ""]

    # ── Canales spot ──────────────────────────────────────────────────────────
    for spot in SPOTS_ORDEN:
        lista      = por_spot[spot]
        nombre_pdf = SPOT_NOMBRE_PDF[spot]
        ch         = SPOT_CHANNELS[spot]
        cs_var     = f"{ch['nombre']}cs"

        lines.append(
            f"% Canal spot: {nombre_pdf}"
            f"  ({len(lista)} capa(s), {cobertura[spot]}%)"
        )

        if not lista:
            lines += [f"% (sin capas para {nombre_pdf})", ""]
            continue

        lines += ["q", f"  {cs_var} setcolorspace"]

        if not preview:
            lines += ["  true setoverprint", ""]

        for capa in lista:
            nombre_c = capa.get("nombre", "Capa").encode("ascii", "replace").decode()
            opacidad = max(0.0, min(1.0, float(capa.get("opacidad", 1.0))))
            lines.append(f"  % {nombre_c}")

            for zona in capa.get("zonas", []):
                forma_ps = _forma_a_ps(zona.get("forma", []))
                if not forma_ps.strip():
                    continue
                if preview:
                    r, g, b = ch["preview_rgb"]
                    lines += [
                        f"  {r:.4f} {g:.4f} {b:.4f} setcolor",
                        "  newpath", forma_ps, "  f", "",
                    ]
                else:
                    lines += [
                        f"  {opacidad:.4f} setcolor",
                        "  newpath", forma_ps, "  f", "",
                    ]

        lines += ["Q", ""]

    # ── Imagen base ───────────────────────────────────────────────────────────
    if embed_imagen and imagen_path:
        lines += _imagen_a_ps_bloque(imagen_path, ancho, alto)
    elif not embed_imagen:
        lines += ["% Imagen omitida (modo solo-spots para RIP)", ""]
    else:
        lines += ["% Sin imagen base", ""]

    lines += ["showpage", "%%EOF", ""]
    return "\n".join(lines)


# ═══════════════════════════════════════════════════════════════════════════════
# GHOSTSCRIPT
# ═══════════════════════════════════════════════════════════════════════════════

def buscar_ghostscript() -> str | None:
    for nombre in ("gswin64c", "gswin32c", "gs"):
        ruta = shutil.which(nombre)
        if ruta:
            return ruta
    gs_dir = r"C:\Program Files\gs"
    if os.path.isdir(gs_dir):
        for version in sorted(os.listdir(gs_dir), reverse=True):
            candidato = os.path.join(gs_dir, version, "bin", "gswin64c.exe")
            if os.path.isfile(candidato):
                return candidato
    return None


def ps_a_pdf(ps_path: str, pdf_path: str, gs_bin: str) -> None:
    cmd = [
        gs_bin, "-dBATCH", "-dNOPAUSE",
        "-sDEVICE=pdfwrite",
        f"-r{OUTPUT_DPI}",           # v4.3: resolución 300 DPI
        "-dPDFSETTINGS=/prepress",
        "-dPreserveSpotColors=true",
        "-dOverprintPreview=true",
        f"-sOutputFile={pdf_path}",
        ps_path,
    ]
    r = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.STDOUT,
                       text=True, encoding="utf-8", errors="replace")
    if r.returncode != 0:
        detalle = (r.stdout or "").strip()
        if not detalle:
            detalle = "sin detalle — activa --debug para conservar el .ps"
        raise RuntimeError(
            f"Ghostscript error (codigo {r.returncode}):\n{detalle[:3000]}"
        )


def generar_pdf(
    datos: dict,
    imagen_path: str | None,
    output_path: str,
    gs_bin: str | None = None,
    preview: bool = False,
    conservar_ps: bool = False,
    embed_imagen: bool = True,
) -> str:
    ps_path    = output_path.replace(".pdf", "_tmp.ps")
    ps_content = generar_postscript(datos, imagen_path, preview=preview,
                                    embed_imagen=embed_imagen)

    with open(ps_path, "w", encoding="ascii", errors="replace") as f:
        f.write(ps_content)

    gs = gs_bin or buscar_ghostscript()
    if not gs:
        raise RuntimeError(
            "Ghostscript no encontrado. "
            "Descargalo en: https://www.ghostscript.com/releases/gsdnld.html"
        )

    try:
        ps_a_pdf(ps_path, output_path, gs)
    except Exception:
        print(f"  [DEBUG] PS conservado: {ps_path}")
        raise
    finally:
        if not conservar_ps and os.path.isfile(ps_path) and os.path.isfile(output_path):
            os.remove(ps_path)

    return output_path


# ═══════════════════════════════════════════════════════════════════════════════
# CLI
# ═══════════════════════════════════════════════════════════════════════════════

def main():
    parser = argparse.ArgumentParser(
        description="XPRIN-Picasso v4.3 — JSON capas → PDF separaciones UV (300 DPI)"
    )
    parser.add_argument("json")
    parser.add_argument("--imagen",    "-i", help="Ruta a la imagen base")
    parser.add_argument("--output",    "-o", help="Ruta del PDF de salida")
    parser.add_argument("--gs",              help="Ruta al ejecutable Ghostscript")
    parser.add_argument("--preview",         action="store_true")
    parser.add_argument("--sin-imagen",      action="store_true",
                        help="Solo paths spot (sin imagen, para RIP)")
    parser.add_argument("--debug",           action="store_true",
                        help="Conserva el .ps tras convertir")
    parser.add_argument("--solo-ps",         action="store_true")
    args = parser.parse_args()

    print(f"\n{'='*60}\n  XPRIN-Picasso — JSON → PDF  (v4.3 — {OUTPUT_DPI} DPI)\n{'='*60}")

    with open(args.json, "r", encoding="utf-8") as f:
        datos = json.load(f)

    embed_img = not args.sin_imagen
    imagen_path = args.imagen
    if not imagen_path and embed_img:
        json_dir   = os.path.dirname(os.path.abspath(args.json))
        img_ref    = datos.get("imagenBase") or {}
        img_nombre = img_ref.get("ruta", "") if isinstance(img_ref, dict) else str(img_ref)
        for cand in [img_nombre, os.path.join(json_dir, img_nombre),
                     os.path.join(json_dir, os.path.basename(img_nombre))]:
            if cand and os.path.isfile(cand):
                imagen_path = cand; break

    base     = os.path.splitext(args.json)[0]
    ps_path  = base + "_tmp.ps"
    pdf_path = args.output or base + "_spots.pdf"

    ps_content = generar_postscript(datos, imagen_path, preview=args.preview,
                                    embed_imagen=embed_img)
    with open(ps_path, "w", encoding="ascii", errors="replace") as f:
        f.write(ps_content)
    print(f"  PS: {ps_path}  ({len(ps_content)//1024} KB)")

    if args.solo_ps:
        print("[OK] --solo-ps listo.")
        return

    gs_bin = args.gs or buscar_ghostscript()
    if not gs_bin:
        print("[AVISO] Ghostscript no encontrado.")
        sys.exit(1)

    try:
        ps_a_pdf(ps_path, pdf_path, gs_bin)
    except RuntimeError as e:
        print(f"\n[ERROR] {e}")
        sys.exit(1)

    if not args.debug and os.path.isfile(ps_path):
        os.remove(ps_path)

    size_kb = os.path.getsize(pdf_path) / 1024
    print(f"[OK] PDF: {pdf_path}  ({size_kb:.1f} KB)")

    area_total = int(datos["documento"]["ancho"]) * int(datos["documento"]["alto"]) or 1
    print(f"\n  {'Canal':<10}  {'Capas':>5}  {'Cobertura':>10}")
    print(f"  {'-'*28}")
    for spot in SPOTS_ORDEN:
        lista = [c for c in datos.get("capas", []) if c.get("spot") == spot]
        pct   = 100 * sum(c.get("area_px", 0) for c in lista) / area_total
        print(f"  {SPOT_NOMBRE_PDF[spot]:<10}  {len(lista):>5}  {pct:>9.2f}%")


if __name__ == "__main__":
    main()
