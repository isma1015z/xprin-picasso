"""
json_to_pdf.py  —  XPRIN-Picasso  (v7.2)
---------------------------------------------------------------
FIXES v7.2:
  - ELIMINADO y-flip: el detector ya genera coords PDF (Y=0=abajo)
    Canvas.jsx hace alto-y para pantalla, PDF NO debe hacerlo
  - Nombre Separation = solo ch['id'] + label limpio (sin %)
    El inkAmount se aplica como valor scn, no en el nombre
  - ColorSpace key = "CS" + id limpio (igual que el PDF de referencia)
  - % en nombres PDF escapado con #25 por si acaso
"""

import io
import json
import os
import sys
import argparse

try:
    from PIL import Image
    HAS_PILLOW = True
except ImportError:
    HAS_PILLOW = False

MAX_IMG_PX = 2500


# ═══════════════════════════════════════════════════════════════════════════════
# HELPERS
# ═══════════════════════════════════════════════════════════════════════════════

def _pdf_name(text: str) -> str:
    """Escapa caracteres reservados en nombres PDF."""
    result = []
    for ch in str(text):
        if ch in ('%', '#', '/', ' ', '(', ')', '<', '>', '[', ']', '{', '}'):
            result.append(f"#{ord(ch):02X}")
        else:
            result.append(ch)
    return "".join(result)


def _separation_name(ch: dict) -> str:
    """
    Nombre del canal Separation tal como lo verá el RIP.
    Formato: ID o ID_Label  (sin porcentaje — el inkAmount va como valor scn).
    Ejemplos: W1, W2, SPOT_1, SPOT_1_Brillo
    """
    lbl = (ch.get("label") or "").strip()
    base = ch["id"]
    name = f"{base}_{lbl}" if lbl else base
    return _pdf_name(name)


def _cs_key(ch: dict) -> str:
    """Clave del ColorSpace en el diccionario Resources. Ej: CSSPOT_1"""
    return "CS" + _pdf_name(ch["id"])


def _hex_to_rgb_float(color: str):
    c = (color or "").strip().lower().lstrip("#")
    if len(c) == 3:
        c = "".join(x * 2 for x in c)
    if len(c) != 6:
        return (0.63, 0.63, 0.69)
    try:
        return (int(c[0:2], 16) / 255.0,
                int(c[2:4], 16) / 255.0,
                int(c[4:6], 16) / 255.0)
    except ValueError:
        return (0.63, 0.63, 0.69)


def _forma_a_pdf_bytes(forma) -> bytes:
    """
    Convierte forma a operadores PDF.
    IMPORTANTE: las coordenadas del detector ya están en espacio PDF
    (Y=0 en la base). NO se hace flip — el código que funciona tampoco lo hacía.
    """
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


# ── Migración backward compat ─────────────────────────────────────────────────

_VIEJO_A_NUEVO = {"w1": "SPOT_1", "w2": "SPOT_2", "texture": "SPOT_1"}

def _migrar_capas(capas: list) -> list:
    migradas = []
    for capa in capas:
        if isinstance(capa.get("spots"), list):
            migradas.append(capa)
            continue
        spot_viejo = capa.get("spot")
        spots = []
        if spot_viejo and spot_viejo in _VIEJO_A_NUEVO:
            spots = [{"channelId": _VIEJO_A_NUEVO[spot_viejo]}]
        migradas.append({**capa, "spots": spots})
    return migradas


def _default_spot_channels(capas: list) -> list:
    ids_vistos = set()
    channels = []
    for capa in capas:
        for sp in (capa.get("spots") or []):
            cid = sp.get("channelId", "")
            if cid and cid not in ids_vistos:
                ids_vistos.add(cid)
                channels.append({"id": cid, "label": "", "inkAmount": 100, "color": "#a0a0ab"})
    return channels or [{"id": "SPOT_1", "label": "", "inkAmount": 100, "color": "#a0a0ab"}]


# ═══════════════════════════════════════════════════════════════════════════════
# GENERADOR PDF NATIVO — v7.2
# ═══════════════════════════════════════════════════════════════════════════════

def generar_pdf_nativo(datos, imagen_path=None, output_path="output.pdf",
                       preview=False, embed_imagen=True):

    doc   = datos["documento"]
    ancho = int(doc["ancho"])
    alto  = int(doc["alto"])

    capas         = _migrar_capas(datos.get("capas", []))
    spot_channels = datos.get("spotChannels") or _default_spot_channels(capas)

    # Agrupar capas visibles por channelId
    por_canal: dict = {ch["id"]: [] for ch in spot_channels}
    for capa in capas:
        if not capa.get("visible", True):
            continue
        for sp in (capa.get("spots") or []):
            cid = sp.get("channelId", "")
            if cid in por_canal:
                por_canal[cid].append(capa)

    canales_activos = [ch for ch in spot_channels if por_canal.get(ch["id"])]

    if not canales_activos:
        raise RuntimeError("No hay capas con spot asignado para generar el PDF.")

    # ── IDs de objetos PDF ────────────────────────────────────────────────────
    #  1  = Catalog
    #  2  = Pages
    #  3  = Page
    #  4  = ExtGState (overprint)
    #  5…4+N = Tint functions
    #  5+N   = Content stream
    #  6+N   = Image (si existe)

    N = len(canales_activos)
    OBJ_CATALOG = 1
    OBJ_PAGES   = 2
    OBJ_PAGE    = 3
    OBJ_GSOP    = 4
    tint_ids    = {ch["id"]: 5 + i for i, ch in enumerate(canales_activos)}
    OBJ_CONTENT = 5 + N
    OBJ_IMAGE   = 5 + N + 1

    # ── Imagen ────────────────────────────────────────────────────────────────
    jpeg_bytes = None
    img_w = img_h = 0
    if embed_imagen and imagen_path and HAS_PILLOW:
        jpeg_bytes, img_w, img_h = _preparar_jpeg(imagen_path)

    # ── Content stream ─────────────────────────────────────────────────────────
    cs = bytearray()

    # 1. Fondo blanco
    cs += f"q\n1 1 1 rg\n0 0 {ancho} {alto} re\nf\nQ\n\n".encode()

    # 2. Imagen original RGB
    if jpeg_bytes:
        cs += f"q\n{ancho} 0 0 {alto} 0 0 cm\n/Im0 Do\nQ\n\n".encode()

    # 3. Spots UV — overprint ON
    for ch in canales_activos:
        cid   = ch["id"]
        key   = _cs_key(ch)       # ej. CSSPOT_1
        lista = por_canal[cid]
        ink   = max(0.0, min(1.0, ch.get("inkAmount", 100) / 100.0))

        for capa in lista:
            for zona in capa.get("zonas", []):
                pb = _forma_a_pdf_bytes(zona.get("forma", []))
                if not pb.strip():
                    continue
                cs += b"q\n"
                if not preview:
                    cs += b"/GSOP gs\n"
                cs += f"/{key} cs\n".encode()
                if preview:
                    r, g, b = _hex_to_rgb_float(ch.get("color", "#a0a0ab"))
                    cs += f"{r:.4f} {g:.4f} {b:.4f} scn\n".encode()
                else:
                    cs += f"{ink:.4f} scn\n".encode()
                cs += pb
                cs += b"f\nQ\n\n"

    content_bytes = bytes(cs)

    # ── Objetos PDF ────────────────────────────────────────────────────────────
    obj_bodies: dict = {}

    # Tint functions
    tint_stream = b"{ pop 0 0 0 0 }"
    tint_hdr = (
        f"<< /FunctionType 4 /Domain [0.0 1.0]"
        f" /Range [0.0 1.0 0.0 1.0 0.0 1.0 0.0 1.0]"
        f" /Length {len(tint_stream)} >>\nstream\n"
    ).encode()
    for ch in canales_activos:
        obj_bodies[tint_ids[ch["id"]]] = tint_hdr + tint_stream + b"\nendstream"

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

    # ColorSpace — /Separation con nombre limpio para el RIP
    cs_entries = []
    for ch in canales_activos:
        key  = _cs_key(ch)              # ej. CSSPOT_1
        name = _separation_name(ch)     # ej. SPOT_1 o SPOT_1_Brillo
        tid  = tint_ids[ch["id"]]
        if preview:
            cs_entries.append(f"      /{key} [/DeviceRGB]")
        else:
            cs_entries.append(
                f"      /{key} [/Separation /{name} /DeviceCMYK {tid} 0 R]"
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

    # Log
    area_total = ancho * alto or 1
    print(f"  [PDF v7.2] {len(canales_activos)} spot(s), {os.path.getsize(output_path)//1024} KB")
    for ch in canales_activos:
        lista = por_canal[ch["id"]]
        pct   = 100 * sum(c.get("area_px", 0) for c in lista) / area_total
        print(f"    /{_separation_name(ch):<25}  {len(lista):>2} capa(s)  {pct:.1f}%")

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
        description="XPRIN-Picasso v7.2 — JSON → PDF imagen + spots UV dinámicos"
    )
    parser.add_argument("json")
    parser.add_argument("--imagen", "-i")
    parser.add_argument("--output", "-o")
    parser.add_argument("--preview",    action="store_true")
    parser.add_argument("--sin-imagen", action="store_true")
    args = parser.parse_args()

    print(f"\n{'='*60}\n  XPRIN-Picasso — JSON → PDF  (v7.2)\n{'='*60}")

    with open(args.json, "r", encoding="utf-8") as f:
        datos = json.load(f)

    embed_img   = not args.sin_imagen
    imagen_path = args.imagen
    if not imagen_path and embed_img:
        json_dir = os.path.dirname(os.path.abspath(args.json))
        for ext in (".png", ".jpg", ".jpeg", ".webp"):
            cand = os.path.join(json_dir, datos.get("id", "imagen") + ext)
            if os.path.isfile(cand):
                imagen_path = cand
                break

    base     = os.path.splitext(args.json)[0]
    pdf_path = args.output or base + "_spots.pdf"

    try:
        generar_pdf(datos, imagen_path, pdf_path,
                    preview=args.preview, embed_imagen=embed_img)
        print(f"\n[OK] {pdf_path}")
    except Exception as e:
        import traceback; traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()
