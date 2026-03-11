"""
json_to_pdf.py  —  XPRIN-Picasso  (v6.3 — spots visualmente invisibles)
---------------------------------------------------------------
Cambio clave respecto a v6.2:

  Tint function: { pop 1 }  (antes: { 1 exch sub })

  - { pop 1 } mapea cualquier valor de tinta → 1.0 en DeviceGray (blanco)
  - Los visores PDF renderizan los spots como blanco = invisible sobre imagen
  - El RIP lee el canal Separation directamente, nunca usa la tint function
  - El overprint y el orden (imagen primero, spots al final) se mantienen

Orden del content stream:
  1. Fondo blanco
  2. Imagen RGB   ← base
  3. Capas CMYK   (OP=false)
  4. Spots UV     ← al final con /OP true /op true /OPM 1
"""

import io
import json
import os
import sys
import argparse

try:
    from PIL import Image, ImageOps
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

MAX_IMG_PX = 2500


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


def _hex_to_cmyk(color):
    if color:
        c = color.strip().lower()
        if c in ("#fff", "#ffffff"):               return (0.0, 0.0, 0.0, 0.0)
        if c in ("#000", "#000000"):               return (0.0, 0.0, 0.0, 1.0)
        if c in ("#00529f","#003d7c","#00468b"):   return (1.0, 0.49, 0.0, 0.38)
        if c in ("#ee324e","#d00020","#cc0022"):   return (0.0, 0.79, 0.67, 0.07)
        if c in ("#febe10","#ffcc00","#f5c518"):   return (0.0, 0.25, 0.94, 0.0)
        if c in ("#6f1f3a","#7b1f3e","#8b1f42"):   return (0.0, 0.72, 0.47, 0.57)
        if c in ("#0d2240","#0a1f3c","#0e2244"):   return (0.96, 0.71, 0.0, 0.75)
    r, g, b = _hex_to_rgb(color)
    k = 1.0 - max(r, g, b)
    if k >= 0.999:
        return (0.0, 0.0, 0.0, 1.0)
    d = 1.0 - k
    return (
        max(0.0, min(1.0, (1.0 - r - k) / d)),
        max(0.0, min(1.0, (1.0 - g - k) / d)),
        max(0.0, min(1.0, (1.0 - b - k) / d)),
        max(0.0, min(1.0, k)),
    )


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


def generar_pdf_nativo(datos, imagen_path=None, output_path="output.pdf",
                       preview=False, embed_imagen=True, textures_data=None):
    doc   = datos["documento"]
    ancho = int(doc["ancho"])
    alto  = int(doc["alto"])
    capas = datos.get("capas", [])

    por_spot   = {s: [] for s in SPOTS_ORDEN}
    capas_cmyk = []
    for capa in capas:
        if not capa.get("visible", True):
            continue
        spot = capa.get("spot")
        if spot in por_spot:
            por_spot[spot].append(capa)
        else:
            capas_cmyk.append(capa)

    OBJ_CATALOG  = 1
    OBJ_PAGES    = 2
    OBJ_PAGE     = 3
    OBJ_GSOP     = 4
    OBJ_GSNOP    = 5
    OBJ_TINT_W1  = 6
    OBJ_TINT_W2  = 7
    OBJ_TINT_TEX = 8
    OBJ_CONTENT  = 9
    OBJ_IMAGE    = 10
    
    # We will reserve object IDs dynamically for textures
    obj_id_counter = 11

    TINT_IDS = {"w1": OBJ_TINT_W1, "w2": OBJ_TINT_W2, "texture": OBJ_TINT_TEX}

    # ── Textures Preparation ───────────────────────────────────────────────────
    # If a layer uses spot "texture", it has a 'texturaId'
    # For each unique texturaId, we need to load its DISP and GLOSS images.
    # Convert them to grayscale, save to bytes.
    # Then create XObjects and Patterns for them.
    texture_patterns = {} # texturaId -> {"disp_pattern_cs": name, "gloss_pattern_cs": name}
    obj_bodies = {}

    if HAS_PILLOW and textures_data:
        used_textura_ids = set()
        for capa in capas:
            if capa.get("visible", True) and capa.get("spot") == "texture" and capa.get("texturaId"):
                used_textura_ids.add(capa["texturaId"])
                
        # Find paths from textures_data
        for tex_id in used_textura_ids:
            tex_info = next((t for t in textures_data if t["id"] == tex_id), None)
            if not tex_info: continue
            
            pats = {}
            for kind, img_url in [("disp", tex_info.get("disp")), ("gloss", tex_info.get("gloss"))]:
                if not img_url: continue
                # img_url is like "/textures/Arcilla/Arcilla_DISP_2K.png"
                # Strip leading slash and map to public folder
                rel_path = img_url.lstrip("/")
                local_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "frontend", "public", rel_path)
                
                if os.path.isfile(local_path):
                    with Image.open(local_path) as im:
                        # Convert to grayscale
                        im_gray = ImageOps.grayscale(im.convert("RGB"))
                        w, h = im_gray.size
                        # Max dimension for texture, don't need 2K for repeating if it's too big, but let's keep it reasonable
                        ratio = 1.0
                        if w > 1024 or h > 1024:
                            ratio = min(1024 / w, 1024 / h)
                            im_gray = im_gray.resize((int(w * ratio), int(h * ratio)), Image.LANCZOS)
                            w, h = im_gray.size
                        
                        buf = io.BytesIO()
                        im_gray.save(buf, format="JPEG", quality=85)
                        jpg_data = buf.getvalue()
                        
                        # Create Image XObject
                        img_obj_id = obj_id_counter
                        obj_id_counter += 1
                        
                        # Image XObject will be drawn in the pattern
                        # We use /DeviceGray, because it's drawn inside an Uncolored Pattern
                        # Wait, if we use Uncolored Pattern, the pattern gives the shape, but the ColorSpace applied during SCN sets the color.
                        # But Image XObject ignores the SCN color if it's an 8-bit image with its own ColorSpace.
                        # If the image has /ColorSpace [/Separation /TEXTURE /DeviceGray 8 0 R], it will just output to TEXTURE channel!
                        # So we don't even need a pattern if we just want to draw an image...
                        # BUT we want to tile it. So we must put it in a Pattern.
                        # Wait! If the Image is explicitly in the Separation space, we can just put it inside a regular Form XObject and tile that?
                        # Or a Colored Tiling Pattern (PaintType 1).
                        # In PaintType 1, the pattern's stream provides the colors.
                        # So we define the image XObject in Separation space.
                        
                        img_hdr = (
                            f"<< /Type /XObject /Subtype /Image\n"
                            f"   /Width {w} /Height {h}\n"
                            f"   /ColorSpace [/Separation /TEXTURE /DeviceGray {OBJ_TINT_TEX} 0 R]\n"
                            f"   /BitsPerComponent 8 /Filter /DCTDecode\n"
                            f"   /Length {len(jpg_data)} >>\nstream\n"
                        ).encode()
                        obj_bodies[img_obj_id] = img_hdr + jpg_data + b"\nendstream"
                        
                        # Now Pattern Stream
                        # We scale the image to a physical size. Let's say textures are 200x200 pixels physically.
                        # Just use w, h as points? 1024 points is 14 inches.
                        # Let's say we scale it to exactly w, h points.
                        # The pattern will tile every w points horizontally and h points vertically.
                        pat_stream = f"q\n{w} 0 0 {h} 0 0 cm\n/ImTex Do\nQ".encode()
                        
                        pat_obj_id = obj_id_counter
                        obj_id_counter += 1
                        
                        pat_hdr = (
                            f"<< /Type /Pattern /PatternType 1\n"
                            f"   /PaintType 1 /TilingType 1\n"
                            f"   /BBox [0 0 {w} {h}]\n"
                            f"   /XStep {w} /YStep {h}\n"
                            f"   /Resources << /XObject << /ImTex {img_obj_id} 0 R >> >>\n"
                            f"   /Length {len(pat_stream)} >>\nstream\n"
                        ).encode()
                        obj_bodies[pat_obj_id] = pat_hdr + pat_stream + b"\nendstream"
                        
                        pats[kind] = pat_obj_id
            
            if pats:
                texture_patterns[tex_id] = pats

    # ── Content stream ─────────────────────────────────────────────────────────
    cs = bytearray()

    # 1. Fondo blanco
    cs += f"q\n1 1 1 rg\n0 0 {ancho} {alto} re\nf\nQ\n\n".encode()

    # 2. Imagen RGB — base
    jpeg_bytes = None
    img_w = img_h = 0
    if embed_imagen and imagen_path and HAS_PILLOW:
        jpeg_bytes, img_w, img_h = _preparar_jpeg(imagen_path)
    if jpeg_bytes:
        cs += f"q\n{ancho} 0 0 {alto} 0 0 cm\n/Im0 Do\nQ\n\n".encode()

    # 3. Capas CMYK (knockout)
    for capa in capas_cmyk:
        cv, mv, yv, kv = _hex_to_cmyk(capa.get("color"))
        for zona in capa.get("zonas", []):
            pb = _forma_a_pdf_bytes(zona.get("forma", []))
            if not pb.strip():
                continue
            cs += b"q\n/GSNOP gs\n"
            cs += f"{cv:.4f} {mv:.4f} {yv:.4f} {kv:.4f} k\n".encode()
            cs += pb
            cs += b"f*\nQ\n\n"

    # 4. Spots UV — al final, overprint ON
    #    Tint function { pop 1 } → visores renderizan blanco (invisible)
    #    El RIP lee el canal Separation directamente, ignora la tint function
    for spot in SPOTS_ORDEN:
        lista = por_spot[spot]
        if not lista:
            continue
        ch      = SPOT_CHANNELS[spot]
        cs_name = f"/CS{ch['nombre']}"

        for capa in lista:
            opacidad = max(0.0, min(1.0, float(capa.get("opacidad", 1.0))))
            
            # Form path bytes
            pb = bytearray()
            for zona in capa.get("zonas", []):
                pb += _forma_a_pdf_bytes(zona.get("forma", []))
            if not pb.strip():
                continue

            if spot == "texture" and not preview and capa.get("texturaId") in texture_patterns:
                # Use Pattern instead of solid color
                pats = texture_patterns[capa.get("texturaId")]
                
                # DRAW DISP Pattern
                if "disp" in pats:
                    cs += b"q\n/GSOP gs\n"
                    cs += f"/Pattern cs\n".encode()
                    cs += f"/Pat{pats['disp']} scn\n".encode()
                    cs += pb
                    cs += b"f*\nQ\n\n"
                    
                # DRAW GLOSS Pattern on top of DISP (in same channel? Yes, overprints on separation)
                if "gloss" in pats:
                    cs += b"q\n/GSOP gs\n"
                    cs += f"/Pattern cs\n".encode()
                    cs += f"/Pat{pats['gloss']} scn\n".encode()
                    cs += pb
                    cs += b"f*\nQ\n\n"
            else:
                # Fallback to Solid SPOT Color
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
    # obj_bodies may already have texture patterns

    # Tint function: { pop 1 }
    # pop descarta el valor de tinta, 1 deja blanco en DeviceGray.
    # Visores normales → blanco = invisible.
    # RIP UV → lee el canal Separation directamente, no usa esta función.
    tint_stream = b"{ pop 1 }"
    for key, oid in TINT_IDS.items():
        hdr = (
            f"<< /FunctionType 4 /Domain [0.0 1.0] /Range [0.0 1.0]"
            f" /Length {len(tint_stream)} >>\nstream\n"
        ).encode()
        obj_bodies[oid] = hdr + tint_stream + b"\nendstream"

    obj_bodies[OBJ_GSOP]  = b"<< /Type /ExtGState /OP true /op true /OPM 1 >>"
    obj_bodies[OBJ_GSNOP] = b"<< /Type /ExtGState /OP false /op false >>"

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
                f"      /{name} [/Separation /{ch['nombre']} /DeviceGray {tid} 0 R]"
            )

    xobj_block = f"\n      /XObject << /Im0 {OBJ_IMAGE} 0 R >>" if jpeg_bytes else ""
    
    # Pattern resources
    pat_entries = []
    for pats in texture_patterns.values():
        for pat_obj_id in pats.values():
            pat_entries.append(f"      /Pat{pat_obj_id} {pat_obj_id} 0 R")
            
    pat_block = ""
    if pat_entries:
        pat_block = f"\n      /Pattern <<\n" + "\n".join(pat_entries) + "\n      >>"

    resources = (
        f"    /Resources <<\n"
        f"      /ExtGState << /GSOP {OBJ_GSOP} 0 R /GSNOP {OBJ_GSNOP} 0 R >>\n"
        f"      /ColorSpace <<\n" + "\n".join(cs_entries) + "\n      >>"
        + xobj_block
        + pat_block
        + "\n    >>"
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
    
    # Load textures_data to know how to map texturaId to image paths
    textures_data = None
    try:
        from map_textures import textures_data as _map_textures_data
        textures_data = _map_textures_data
    except ImportError:
        # Maybe we should load textures.js or JSON directly if map_textures doesn't expose it
        pass
        
    # We will just parse textures.js directly since we wrote it there
    local_tex_js = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "frontend", "src", "textures.js")
    if os.path.exists(local_tex_js):
        with open(local_tex_js, "r", encoding="utf-8") as f:
            content = f.read()
            if "export const TEXTURES = " in content:
                json_str = content.split("export const TEXTURES = ")[1].rstrip(";\n")
                try:
                    textures_data = json.loads(json_str)
                except Exception:
                    pass

    return generar_pdf_nativo(
        datos, imagen_path, output_path,
        preview=preview, embed_imagen=embed_imagen, textures_data=textures_data
    )


def main():
    parser = argparse.ArgumentParser(
        description="XPRIN-Picasso v6.3 — JSON → PDF separaciones UV"
    )
    parser.add_argument("json")
    parser.add_argument("--imagen",    "-i")
    parser.add_argument("--output",    "-o")
    parser.add_argument("--preview",         action="store_true")
    parser.add_argument("--sin-imagen",      action="store_true")
    args = parser.parse_args()

    print(f"\n{'='*60}\n  XPRIN-Picasso — JSON → PDF  (v6.3)\n{'='*60}")

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

    size_kb = os.path.getsize(pdf_path) / 1024
    print(f"[OK] PDF: {pdf_path}  ({size_kb:.1f} KB)")

    area_total = int(datos["documento"]["ancho"]) * int(datos["documento"]["alto"]) or 1
    print(f"\n  Canal       Capas   Cobertura")
    print(f"  {'-'*30}")
    for spot in SPOTS_ORDEN:
        lista = [c for c in datos.get("capas", []) if c.get("spot") == spot]
        pct   = 100 * sum(c.get("area_px", 0) for c in lista) / area_total
        print(f"  {SPOT_NOMBRE_PDF[spot]:<10}  {len(lista):>5}  {pct:>9.2f}%")


if __name__ == "__main__":
    main()
