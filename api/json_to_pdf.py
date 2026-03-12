"""
json_to_pdf.py — XPRIN-Picasso (v9.0 — Soporte dinámico para múltiples canales)
---------------------------------------------------------------------------
Genera un PDF con una imagen RGB de fondo y múltiples canales "Spot" (Separación)
encima con overprint. Compatible con el formato de canales dinámicos (spots[]).
"""

import io
import json
import os
import uuid
import math
from PIL import Image

HAS_PILLOW = True

# ═══════════════════════════════════════════════════════════════════════════════
# UTILS COLORES
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

# ═══════════════════════════════════════════════════════════════════════════════
# PATHS A PDF BYTES
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
# TRATAMIENTO IMAGEN
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
    if not os.path.isfile(imagen_path):
        return None, 0, 0
    img = _abrir_sobre_blanco(imagen_path)
    w, h = img.size
    # Redimensionar si es excesiva para el PDF
    if w > 3000 or h > 3000:
        ratio = min(3000 / w, 3000 / h)
        img = img.resize((int(w * ratio), int(h * ratio)), Image.LANCZOS)
    iw, ih = img.size
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=92, optimize=True)
    return buf.getvalue(), iw, ih

# ═══════════════════════════════════════════════════════════════════════════════
# GENERADOR PDF
# ═══════════════════════════════════════════════════════════════════════════════

def generar_pdf(datos, imagen_path, output_path, preview=False, embed_imagen=True, **kwargs):
    doc    = datos["documento"]
    ancho  = int(doc["ancho"])
    alto   = int(doc["alto"])
    capas  = datos.get("capas", [])
    channels = datos.get("spotChannels", [])

    # IDs de objetos fijos
    OBJ_CATALOG  = 1
    OBJ_PAGES    = 2
    OBJ_PAGE     = 3
    OBJ_GSOP     = 4
    OBJ_CONTENT  = 5
    OBJ_IMAGE    = 6
    
    # Dinámicos: Funciones de tinta (Separation functions)
    # Empezamos los objetos de canales desde el 10
    CHANNEL_OBJS = {}
    next_obj = 10
    
    # Mapeo de canales para acceso rápido
    channel_map = {ch["id"]: ch for ch in channels}
    
    # Clasificar el contenido por canal
    por_canal = {ch["id"]: [] for ch in channels}
    for capa in capas:
        if not capa.get("visible", True): continue
        # Formato nuevo: capa.spots = list
        spots_list = capa.get("spots", [])
        for s_ref in spots_list:
            cid = s_ref.get("channelId")
            if cid in por_canal:
                por_canal[cid].append({"capa": capa, "spot_config": s_ref})

    # ── Content Stream ────────────────────────────────────────────────────────
    cs = bytearray()
    
    # 1. Fondo blanco (opcional pero recomendado)
    cs += f"q\n1 1 1 rg\n0 0 {ancho} {alto} re\nf\nQ\n\n".encode()

    # 2. Imagen de fondo
    jpeg_bytes = None
    if embed_imagen and imagen_path:
        jpeg_bytes, img_w, img_h = _preparar_jpeg(imagen_path)
    if jpeg_bytes:
        cs += f"q\n{ancho} 0 0 {alto} 0 0 cm\n/Im0 Do\nQ\n\n".encode()

    # 3. Canales Spot
    for cid in por_canal:
        items = por_canal[cid]
        if not items: continue
        
        ch = channel_map[cid]
        ch_name = ch.get("id", "SPOT").replace(" ", "_")
        cs_name = f"/CS_{ch_name}"
        
        # Registrar objeto de función de tinta si no estamos en preview
        if not preview:
            CHANNEL_OBJS[cid] = next_obj
            next_obj += 1

        for item in items:
            capa = item["capa"]
            opacidad = float(capa.get("opacidad", 1.0))
            
            for zona in capa.get("zonas", []):
                pb = _forma_a_pdf_bytes(zona.get("forma", []))
                if not pb.strip(): continue
                
                cs += b"q\n"
                if not preview:
                    cs += b"/GSOP gs\n"
                
                cs += f"{cs_name} cs\n".encode()
                
                if preview:
                    r, g, b = _hex_to_rgb(ch.get("color", "#000000"))
                    cs += f"{r:.4f} {g:.4f} {b:.4f} scn\n".encode()
                else:
                    cs += f"{opacidad:.4f} scn\n".encode()
                
                cs += pb
                cs += b"f*\nQ\n\n"

    content_bytes = bytes(cs)

    # ── Objetos PDF ───────────────────────────────────────────────────────────
    obj_bodies = {}
    
    # GSOP (Overprint)
    obj_bodies[OBJ_GSOP] = b"<< /Type /ExtGState /OP true /op true /OPM 1 >>"
    
    # Content
    obj_bodies[OBJ_CONTENT] = (f"<< /Length {len(content_bytes)} >>\nstream\n").encode() + content_bytes + b"\nendstream"
    
    # Image
    if jpeg_bytes:
        img_hdr = (
            f"<< /Type /XObject /Subtype /Image /ColorSpace /DeviceRGB /Width {img_w} /Height {img_h} "
            f"/BitsPerComponent 8 /Filter /DCTDecode /Length {len(jpeg_bytes)} >>\nstream\n"
        ).encode()
        obj_bodies[OBJ_IMAGE] = img_hdr + jpeg_bytes + b"\nendstream"
    
    # Funciones de Tinta (Tint transforms)
    tint_func = b"{ pop 0 0 0 0 }" # Alternate DeviceCMYK -> invisible/white
    for cid, oid in CHANNEL_OBJS.items():
        hdr = (f"<< /FunctionType 4 /Domain [0.0 1.0] /Range [0.0 1.0 0.0 1.0 0.0 1.0 0.0 1.0] /Length {len(tint_func)} >>\nstream\n").encode()
        obj_bodies[oid] = hdr + tint_func + b"\nendstream"
        
    # Resources
    cs_entries = []
    for ch in channels:
        cid = ch["id"]
        if cid not in por_canal or not por_canal[cid]: continue
        
        ch_name = cid.replace(" ", "_")
        pdf_name = ch.get("label", cid).strip() or cid
        if not pdf_name: pdf_name = cid
        
        name_key = f"CS_{ch_name}"
        if preview:
            cs_entries.append(f"/{name_key} [/DeviceRGB]")
        else:
            oid = CHANNEL_OBJS[cid]
            cs_entries.append(f"/{name_key} [/Separation /{pdf_name} /DeviceCMYK {oid} 0 R]")
            
    res_block = (
        f"<< /ExtGState << /GSOP {OBJ_GSOP} 0 R >>\n"
        f"   /ColorSpace << {' '.join(cs_entries)} >>\n"
    )
    if jpeg_bytes:
        res_block += f"   /XObject << /Im0 {OBJ_IMAGE} 0 R >>\n"
    res_block += ">>"
    
    obj_bodies[OBJ_PAGE] = (
        f"<< /Type /Page /Parent {OBJ_PAGES} 0 R /MediaBox [0 0 {ancho} {alto}] "
        f"/Resources {res_block} /Contents {OBJ_CONTENT} 0 R >>"
    ).encode()
    
    obj_bodies[OBJ_PAGES]   = f"<< /Type /Pages /Kids [{OBJ_PAGE} 0 R] /Count 1 >>".encode()
    obj_bodies[OBJ_CATALOG] = f"<< /Type /Catalog /Pages {OBJ_PAGES} 0 R >>".encode()

    # ── Ensamblado Final ──────────────────────────────────────────────────────
    buf = bytearray(b"%PDF-1.4\n%\xe2\xe3\xcf\xd3\n")
    offsets = {}
    for oid in sorted(obj_bodies.keys()):
        offsets[oid] = len(buf)
        buf += f"{oid} 0 obj\n".encode() + obj_bodies[oid] + b"\nendobj\n\n"
        
    xref_pos = len(buf)
    max_id = max(obj_bodies.keys())
    buf += f"xref\n0 {max_id + 1}\n0000000000 65535 f \n".encode()
    for i in range(1, max_id + 1):
        if i in offsets: buf += f"{offsets[i]:010d} 00000 n \n".encode()
        else: buf += b"0000000000 65535 f \n"
        
    buf += f"trailer\n<< /Size {max_id + 1} /Root {OBJ_CATALOG} 0 R >>\nstartxref\n{xref_pos}\n%%EOF\n".encode()

    with open(output_path, "wb") as f:
        f.write(buf)
    return output_path
