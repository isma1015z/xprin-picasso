"""
json_to_pdf.py  —  XPRIN-Picasso  (v6.7 — imagen original + solo spots)
---------------------------------------------------------------
Idea: eliminar las capas CMYK vectorizadas del PDF.

  El RIP recibe:
    1. Imagen original RGB como fondo  → el RIP aplica su propio perfil de color
    2. Spots UV encima con overprint   → W1, W2, TEXTURE

  Sin capas CMYK vectorizadas:
    - No hay conversión RGB→CMYK nuestra que distorsione los colores
    - El RIP procesa la imagen directamente con su perfil ICC
    - Los colores salen fieles al original

Orden del content stream:
  1. Fondo blanco
  2. Imagen RGB   ← el RIP la gestiona con su perfil propio
  3. Spots UV     ← al final con /OP true /op true /OPM 1
  (sin capas CMYK vectorizadas)
"""

import io
import json
import os
import sys
import argparse
import math

try:
    from PIL import Image
    HAS_PILLOW = True
except ImportError:
    HAS_PILLOW = False


SPOTS_ORDEN = ["w1", "w2", "texture"]

SPOT_NOMBRE_PDF = {
    "w1":      "W1",
    "w2":      "W2",
    "texture": "TEXTURE",
}

SPOT_CHANNELS = {
    "w1":      {"nombre": "W1",      "preview_rgb": (0.63, 0.63, 0.69)},
    "w2":      {"nombre": "W2",      "preview_rgb": (0.48, 0.55, 0.87)},
    "texture": {"nombre": "TEXTURE", "preview_rgb": (0.94, 0.71, 0.16)},
}

MAX_IMG_PX   = 2500
GCR_STRENGTH = 0.85
TAC_LIMIT    = 2.80


# ═══════════════════════════════════════════════════════════════════════════════
# COLORES (mantenido por si se necesita en preview)
# ═══════════════════════════════════════════════════════════════════════════════

def _hex_to_rgb(color):
    if not color:
        return (0.0, 0.0, 0.0)
    c = color.strip().lower().lstrip("#")
    if len(c) == 3:
        c = "".join(ch * 2 for ch in c)
    if len(c) != 6:
        return (0.0, 0.0, 0.0)
    try:
        return (int(c[0:2], 16) / 255.0,
                int(c[2:4], 16) / 255.0,
                int(c[4:6], 16) / 255.0)
    except ValueError:
        return (0.0, 0.0, 0.0)


def _srgb_to_linear(v):
    v = max(0.0, min(1.0, v))
    if v <= 0.04045:
        return v / 12.92
    return ((v + 0.055) / 1.055) ** 2.4


def _hex_to_cmyk(color):
    if not color:
        return (0.0, 0.0, 0.0, 1.0)
    r, g, b = _hex_to_rgb(color)
    if r >= 0.999 and g >= 0.999 and b >= 0.999:
        return (0.0, 0.0, 0.0, 0.0)
    if r <= 0.001 and g <= 0.001 and b <= 0.001:
        return (0.0, 0.0, 0.0, 1.0)
    rl = _srgb_to_linear(r)
    gl = _srgb_to_linear(g)
    bl = _srgb_to_linear(b)
    c = 1.0 - rl
    m = 1.0 - gl
    y = 1.0 - bl
    achrom = min(c, m, y)
    k_raw = achrom ** (1.0 / 1.4)
    k     = k_raw * GCR_STRENGTH
    if achrom > 0.001:
        gcr_fraction = k / achrom
        c = c - achrom * gcr_fraction
        m = m - achrom * gcr_fraction
        y = y - achrom * gcr_fraction
    c = max(0.0, min(1.0, c))
    m = max(0.0, min(1.0, m))
    y = max(0.0, min(1.0, y))
    k = max(0.0, min(1.0, k))
    tac = c + m + y + k
    if tac > TAC_LIMIT:
        scale = TAC_LIMIT / tac
        c *= scale; m *= scale; y *= scale; k *= scale
    return (round(c, 4), round(m, 4), round(y, 4), round(k, 4))


# ═══════════════════════════════════════════════════════════════════════════════
# PATHS
# ═══════════════════════════════════════════════════════════════════════════════

def _forma_a_pdf_bytes(forma):
    partes = []
    for cmd in forma:
        t = cmd.get("tipo", "")
        if t == "moveto":
            partes.append(f"{cmd['x']:.3f} {cmd['y']:.3f} m\n")
        elif t == "lineto":
            partes.append(f"{cmd['x']:.3f} {cmd['y']:.3f} l\n")
        elif t == "curveto":
            partes.append(
                f"{cmd['x1']:.3f} {cmd['y1']:.3f} "
                f"{cmd['x2']:.3f} {cmd['y2']:.3f} "
                f"{cmd['x']:.3f} {cmd['y']:.3f} c\n"
            )
        elif t == "closepath":
            partes.append("h\n")
    return "".join(partes).encode("ascii")


# ═══════════════════════════════════════════════════════════════════════════════
# IMAGEN
# ═══════════════════════════════════════════════════════════════════════════════

def _abrir_sobre_blanco(imagen_path):
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


def _preparar_jpeg(imagen_path):
    if not HAS_PILLOW or not os.path.isfile(imagen_path):
        return None, 0, 0
    img = _abrir_sobre_blanco(imagen_path)
    w, h = img.size
    if w > MAX_IMG_PX or h > MAX_IMG_PX:
        ratio = min(MAX_IMG_PX / w, MAX_IMG_PX / h)
        img = img.resize((int(w * ratio), int(h * ratio)), Image.LANCZOS)
    iw, ih = img.size
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=95, optimize=True)
    return buf.getvalue(), iw, ih


# ═══════════════════════════════════════════════════════════════════════════════
# GENERADOR PDF NATIVO
# ═══════════════════════════════════════════════════════════════════════════════

def generar_pdf_nativo(datos, imagen_path=None, output_path="output.pdf",
                       preview=False, embed_imagen=True):
    doc   = datos["documento"]
    ancho = int(doc["ancho"])
    alto  = int(doc["alto"])
    capas = datos.get("capas", [])

    # Solo clasificar por spot — las capas CMYK no se pintan en el PDF
    por_spot = {s: [] for s in SPOTS_ORDEN}
    for capa in capas:
        if not capa.get("visible", True):
            continue
        spot = capa.get("spot")
        if spot in por_spot:
            por_spot[spot].append(capa)
        # capas sin spot asignado → se ignoran (la imagen las representa)

    OBJ_CATALOG  = 1
    OBJ_PAGES    = 2
    OBJ_PAGE     = 3
    OBJ_GSOP     = 4
    OBJ_TINT_W1  = 5
    OBJ_TINT_W2  = 6
    OBJ_TINT_TEX = 7
    OBJ_CONTENT  = 8
    OBJ_IMAGE    = 9

    TINT_IDS = {"w1": OBJ_TINT_W1, "w2": OBJ_TINT_W2, "texture": OBJ_TINT_TEX}

    # ── Content stream ─────────────────────────────────────────────────────────
    cs = bytearray()

    # 1. Fondo blanco
    cs += f"q\n1 1 1 rg\n0 0 {ancho} {alto} re\nf\nQ\n\n".encode()

    # 2. Imagen original RGB — el RIP la gestiona con su propio perfil
    jpeg_bytes = None
    img_w = img_h = 0
    if embed_imagen and imagen_path and HAS_PILLOW:
        jpeg_bytes, img_w, img_h = _preparar_jpeg(imagen_path)
    if jpeg_bytes:
        cs += f"q\n{ancho} 0 0 {alto} 0 0 cm\n/Im0 Do\nQ\n\n".encode()

    # 3. Spots UV — al final, overprint ON
    #    Sin capas CMYK entre medio: el RIP ve imagen limpia + spots puros
    for spot in SPOTS_ORDEN:
        lista = por_spot[spot]
        if not lista:
            continue
        ch      = SPOT_CHANNELS[spot]
        cs_name = f"/CS{ch['nombre']}"

        for capa in lista:
            opacidad = max(0.0, min(1.0, float(capa.get("opacidad", 1.0))))
            for zona in capa.get("zonas", []):
                pb = _forma_a_pdf_bytes(zona.get("forma", []))
                if not pb.strip():
                    continue
                cs += b"q\n"
                if not preview:
                    cs += b"/GSOP gs\n"
                cs += f"{cs_name} cs\n".encode()
                if preview:
                    r, g, b = ch["preview_rgb"]
                    cs += f"{r:.4f} {g:.4f} {b:.4f} scn\n".encode()
                else:
                    cs += f"{opacidad:.4f} scn\n".encode()
                cs += pb
                cs += b"f*\nQ\n\n"

    content_bytes = bytes(cs)

    # ── Objetos PDF ────────────────────────────────────────────────────────────
    obj_bodies = {}

    # Tint function: { pop 0 0 0 0 } — alternate DeviceCMYK → invisible en visores
    tint_stream = b"{ pop 0 0 0 0 }"
    for key, oid in TINT_IDS.items():
        hdr = (
            f"<< /FunctionType 4 /Domain [0.0 1.0]"
            f" /Range [0.0 1.0 0.0 1.0 0.0 1.0 0.0 1.0]"
            f" /Length {len(tint_stream)} >>\nstream\n"
        ).encode()
        obj_bodies[oid] = hdr + tint_stream + b"\nendstream"

    # Solo GSOP — ya no necesitamos GSNOP (sin capas CMYK)
    obj_bodies[OBJ_GSOP] = b"<< /Type /ExtGState /OP true /op true /OPM 1 >>"

    obj_bodies[OBJ_CONTENT] = (
        f"<< /Length {len(content_bytes)} >>\nstream\n"
    ).encode() + content_bytes + b"\nendstream"

    if jpeg_bytes:
        img_hdr = (
            f"<< /Type /XObject /Subtype /Image"
            f" /ColorSpace /DeviceRGB"
            f" /Width {img_w} /Height {img_h}"
            f" /BitsPerComponent 8 /Filter /DCTDecode"
            f" /Length {len(jpeg_bytes)} >>\nstream\n"
        ).encode()
        obj_bodies[OBJ_IMAGE] = img_hdr + jpeg_bytes + b"\nendstream"

    cs_entries = []
    for key in SPOTS_ORDEN:
        ch   = SPOT_CHANNELS[key]
        name = f"CS{ch['nombre']}"
        if preview:
            cs_entries.append(f"      /{name} [/DeviceRGB]")
        else:
            tid = TINT_IDS[key]
            cs_entries.append(
                f"      /{name} [/Separation /{ch['nombre']} /DeviceCMYK {tid} 0 R]"
            )

    xobj_block = f"\n      /XObject << /Im0 {OBJ_IMAGE} 0 R >>" if jpeg_bytes else ""

    resources = (
        f"    /Resources <<\n"
        f"      /ExtGState << /GSOP {OBJ_GSOP} 0 R >>\n"
        f"      /ColorSpace <<\n" + "\n".join(cs_entries) + "\n      >>"
        + xobj_block + "\n    >>"
    )

    obj_bodies[OBJ_PAGE] = (
        f"<< /Type /Page\n"
        f"   /Parent {OBJ_PAGES} 0 R\n"
        f"   /MediaBox [0 0 {ancho} {alto}]\n"
        f"{resources}\n"
        f"   /Contents {OBJ_CONTENT} 0 R\n"
        f">>"
    ).encode()

    obj_bodies[OBJ_PAGES]   = f"<< /Type /Pages /Kids [{OBJ_PAGE} 0 R] /Count 1 >>".encode()
    obj_bodies[OBJ_CATALOG] = f"<< /Type /Catalog /Pages {OBJ_PAGES} 0 R >>".encode()

    # ── Serializar ─────────────────────────────────────────────────────────────
    buf = bytearray()
    buf += b"%PDF-1.4\n%\xe2\xe3\xcf\xd3\n"

    offsets = {}
    for oid in sorted(obj_bodies.keys()):
        offsets[oid] = len(buf)
        buf += f"{oid} 0 obj\n".encode()
        buf += obj_bodies[oid]
        buf += b"\nendobj\n\n"

    xref_pos = len(buf)
    max_id   = max(obj_bodies.keys())
    buf += f"xref\n0 {max_id + 1}\n".encode()
    buf += b"0000000000 65535 f \n"
    for i in range(1, max_id + 1):
        if i in offsets:
            buf += f"{offsets[i]:010d} 00000 n \n".encode()
        else:
            buf += b"0000000000 65535 f \n"

    buf += (
        f"trailer\n<< /Size {max_id + 1} /Root {OBJ_CATALOG} 0 R >>\n"
        f"startxref\n{xref_pos}\n%%EOF\n"
    ).encode()

    with open(output_path, "wb") as f:
        f.write(buf)

    return output_path


def generar_pdf(datos, imagen_path, output_path, preview=False,
                conservar_ps=False, embed_imagen=True, gs_bin=None):
    return generar_pdf_nativo(
        datos, imagen_path, output_path,
        preview=preview, embed_imagen=embed_imagen,
    )


# ═══════════════════════════════════════════════════════════════════════════════
# CLI
# ═══════════════════════════════════════════════════════════════════════════════

def main():
    parser = argparse.ArgumentParser(
        description="XPRIN-Picasso v6.7 — JSON → PDF imagen + spots UV"
    )
    parser.add_argument("json")
    parser.add_argument("--imagen",    "-i")
    parser.add_argument("--output",    "-o")
    parser.add_argument("--preview",         action="store_true")
    parser.add_argument("--sin-imagen",      action="store_true")
    args = parser.parse_args()

    print(f"\n{'='*60}\n  XPRIN-Picasso — JSON → PDF  (v6.7)\n{'='*60}")

    with open(args.json, "r", encoding="utf-8") as f:
        datos = json.load(f)

    embed_img   = not args.sin_imagen
    imagen_path = args.imagen
    if not imagen_path and embed_img:
        json_dir   = os.path.dirname(os.path.abspath(args.json))
        img_ref    = datos.get("imagenBase") or {}
        img_nombre = img_ref.get("ruta", "") if isinstance(img_ref, dict) else str(img_ref)
        for cand in [img_nombre,
                     os.path.join(json_dir, img_nombre),
                     os.path.join(json_dir, os.path.basename(img_nombre))]:
            if cand and os.path.isfile(cand):
                imagen_path = cand
                break

    base     = os.path.splitext(args.json)[0]
    pdf_path = args.output or base + "_spots.pdf"

    try:
        generar_pdf(datos, imagen_path, pdf_path,
                    preview=args.preview, embed_imagen=embed_img)
    except Exception as e:
        import traceback; traceback.print_exc()
        sys.exit(1)

    size_kb    = os.path.getsize(pdf_path) / 1024
    area_total = int(datos["documento"]["ancho"]) * int(datos["documento"]["alto"]) or 1
    print(f"[OK] {pdf_path}  ({size_kb:.1f} KB)\n")
    print(f"  {'Canal':<10} {'Capas':>5}  {'Cobertura':>9}")
    print(f"  {'-'*28}")
    for spot in SPOTS_ORDEN:
        lista = [c for c in datos.get("capas", []) if c.get("spot") == spot]
        pct   = 100 * sum(c.get("area_px", 0) for c in lista) / area_total
        print(f"  {SPOT_NOMBRE_PDF[spot]:<10} {len(lista):>5}  {pct:>9.2f}%")


if __name__ == "__main__":
    main()
