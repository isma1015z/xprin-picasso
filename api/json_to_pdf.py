"""
json_to_pdf.py — XPRIN-Picasso (v9.5 — Soporte dinámico + Texturas Tiling)
---------------------------------------------------------------------------
Genera un PDF con una imagen RGB de fondo y múltiples canales "Spot" (Separación)
encima con overprint. Soporta texturas SVG aplicadas como patrones de repetición.
"""

import io
import json
import os
import uuid
import math
import re
from PIL import Image

# ═══════════════════════════════════════════════════════════════════════════════
# UTILS SVG A PDF
# ═══════════════════════════════════════════════════════════════════════════════

def _svg_path_to_pdf(svg_d, tile_size):
    """Convierte un string 'd' de SVG a comandos raw de PDF, invirtiendo Y."""
    # Regex para extraer comandos y sus argumentos
    tokens = re.findall(r'([A-Za-z])|(-?\d*\.?\d+)', svg_d)
    
    pdf = []
    curr_x, curr_y = 0.0, 0.0
    start_x, start_y = 0.0, 0.0
    
    i = 0
    while i < len(tokens):
        cmd = tokens[i][0]
        if not cmd: # Si es un número sin comando previo, repetir último comando
            i += 1; continue 
        
        # Recoger argumentos
        args = []
        i += 1
        while i < len(tokens) and tokens[i][1]:
            args.append(float(tokens[i][1]))
            i += 1
            
        def _to_pdf_y(y): return tile_size - y

        if cmd == 'M':
            curr_x, curr_y = args[0], args[1]
            start_x, start_y = curr_x, curr_y
            pdf.append(f"{curr_x:.3f} {_to_pdf_y(curr_y):.3f} m")
        elif cmd == 'm':
            curr_x += args[0]; curr_y += args[1]
            start_x, start_y = curr_x, curr_y
            pdf.append(f"{curr_x:.3f} {_to_pdf_y(curr_y):.3f} m")
        elif cmd == 'L':
            curr_x, curr_y = args[0], args[1]
            pdf.append(f"{curr_x:.3f} {_to_pdf_y(curr_y):.3f} l")
        elif cmd == 'l':
            curr_x += args[0]; curr_y += args[1]
            pdf.append(f"{curr_x:.3f} {_to_pdf_y(curr_y):.3f} l")
        elif cmd == 'H':
            curr_x = args[0]
            pdf.append(f"{curr_x:.3f} {_to_pdf_y(curr_y):.3f} l")
        elif cmd == 'h':
            curr_x += args[0]
            pdf.append(f"{curr_x:.3f} {_to_pdf_y(curr_y):.3f} l")
        elif cmd == 'V':
            curr_y = args[0]
            pdf.append(f"{curr_x:.3f} {_to_pdf_y(curr_y):.3f} l")
        elif cmd == 'v':
            curr_y += args[0]
            pdf.append(f"{curr_x:.3f} {_to_pdf_y(curr_y):.3f} l")
        elif cmd == 'C':
            pdf.append(f"{args[0]:.3f} {_to_pdf_y(args[1]):.3f} {args[2]:.3f} {_to_pdf_y(args[3]):.3f} {args[4]:.3f} {_to_pdf_y(args[5]):.3f} c")
            curr_x, curr_y = args[4], args[5]
        elif cmd == 'c':
            pdf.append(f"{curr_x+args[0]:.3f} {_to_pdf_y(curr_y+args[1]):.3f} {curr_x+args[2]:.3f} {_to_pdf_y(curr_y+args[3]):.3f} {curr_x+args[4]:.3f} {_to_pdf_y(curr_y+args[5]):.3f} c")
            curr_x += args[4]; curr_y += args[5]
        elif cmd.lower() == 'z':
            pdf.append("h")
            curr_x, curr_y = start_x, start_y
            
    return "\n".join(pdf)

def _hex_to_rgb(color):
    if not color: return (0.0, 0.0, 0.0)
    c = color.strip().lower().lstrip("#")
    if len(c) == 3: c = "".join(ch * 2 for ch in c)
    if len(c) != 6: return (0.0, 0.0, 0.0)
    try:
        return (int(c[0:2], 16) / 255.0, int(c[2:4], 16) / 255.0, int(c[4:6], 16) / 255.0)
    except ValueError: return (0.0, 0.0, 0.0)

# ═══════════════════════════════════════════════════════════════════════════════
# GENERADOR PDF
# ═══════════════════════════════════════════════════════════════════════════════

def _forma_a_pdf_bytes(forma):
    partes = []
    for cmd in forma:
        t = cmd.get("tipo", "")
        if t == "moveto": partes.append(f"{cmd['x']:.3f} {cmd['y']:.3f} m\n")
        elif t == "lineto": partes.append(f"{cmd['x']:.3f} {cmd['y']:.3f} l\n")
        elif t == "curveto":
            partes.append(f"{cmd['x1']:.3f} {cmd['y1']:.3f} {cmd['x2']:.3f} {cmd['y2']:.3f} {cmd['x']:.3f} {cmd['y']:.3f} c\n")
        elif t == "closepath": partes.append("h\n")
    return "".join(partes).encode("ascii")

def _abrir_sobre_blanco(imagen_path):
    img = Image.open(imagen_path)
    if img.mode != "RGB":
        if "A" in img.mode or img.mode == "P":
            img = img.convert("RGBA")
            fondo = Image.new("RGB", img.size, (255, 255, 255))
            fondo.paste(img, mask=img.split()[3])
            img = fondo
        else:
            img = img.convert("RGB")
    return img

def _preparar_jpeg(imagen_path):
    if not os.path.isfile(imagen_path): return None, 0, 0
    img = _abrir_sobre_blanco(imagen_path)
    w, h = img.size
    if w > 3000 or h > 3000:
        ratio = min(3000/w, 3000/h); img = img.resize((int(w*ratio), int(h*ratio)), Image.LANCZOS)
    iw, ih = img.size
    buf = io.BytesIO(); img.save(buf, format="JPEG", quality=92, optimize=True)
    return buf.getvalue(), iw, ih

def generar_pdf(datos, imagen_path, output_path, preview=False, embed_imagen=True, **kwargs):
    doc = datos["documento"]; ancho = int(doc["ancho"]); alto = int(doc["alto"])
    capas = datos.get("capas", []); channels = datos.get("spotChannels", [])

    OBJ_CATALOG = 1; OBJ_PAGES = 2; OBJ_PAGE = 3; OBJ_GSOP = 4; OBJ_CONTENT = 5; OBJ_IMAGE = 6
    CHANNEL_OBJS = {}; PATTERN_OBJS = {}; next_obj = 10
    
    channel_map = {ch["id"]: ch for ch in channels}
    por_canal = {ch["id"]: [] for ch in channels}
    for capa in capas:
        if not capa.get("visible", True): continue
        for s_ref in capa.get("spots", []):
            cid = s_ref.get("channelId")
            if cid in por_canal: por_canal[cid].append({"capa": capa, "spot_config": s_ref})

    # ── Content Stream ────────────────────────────────────────────────────────
    cs = bytearray()
    cs += f"q\n1 1 1 rg\n0 0 {ancho} {alto} re\nf\nQ\n\n".encode()

    jpeg_bytes = None
    if embed_imagen and imagen_path:
        jpeg_bytes, img_w, img_h = _preparar_jpeg(imagen_path)
    if jpeg_bytes:
        cs += f"q\n{ancho} 0 0 {alto} 0 0 cm\n/Im0 Do\nQ\n\n".encode()

    for cid in por_canal:
        items = por_canal[cid]
        if not items: continue
        ch = channel_map[cid]
        cs_name = f"/CS_{cid.replace(' ', '_')}"
        if not preview: CHANNEL_OBJS[cid] = next_obj; next_obj += 1

        for item in items:
            capa, s_conf = item["capa"], item["spot_config"]
            tex_svg = s_conf.get("texturaSvg")
            opacidad = float(capa.get("opacidad", 1.0))
            
            p_key = None
            if tex_svg and not preview:
                p_key = f"P_{cid}_{capa['id']}_{str(uuid.uuid4())[:4]}"
                PATTERN_OBJS[p_key] = {"obj": next_obj, "svg": tex_svg, "size": s_conf.get("tileSize", 80), "channel": ch}
                next_obj += 1

            for zona in capa.get("zonas", []):
                pb = _forma_a_pdf_bytes(zona.get("forma", []))
                if not pb.strip(): continue
                cs += b"q\n"
                if not preview: cs += b"/GSOP gs\n"
                
                if p_key:
                    cs += b"/Pattern cs\n"
                    cs += f"/{p_key} scn\n".encode()
                else:
                    cs += f"{cs_name} cs\n".encode()
                    if preview:
                        r, g, b = _hex_to_rgb(ch.get("color", "#000000"))
                        cs += f"{r:.4f} {g:.4f} {b:.4f} scn\n".encode()
                    else:
                        cs += f"{opacidad:.4f} scn\n".encode()
                
                cs += pb + b"f*\nQ\n\n"

    # ── Armar Objetos ──────────────────────────────────────────────────────────
    obj_bodies = {}
    obj_bodies[OBJ_GSOP] = b"<< /Type /ExtGState /OP true /op true /OPM 1 >>"
    obj_bodies[OBJ_CONTENT] = f"<< /Length {len(cs)} >>\nstream\n".encode() + cs + b"\nendstream"
    if jpeg_bytes:
        obj_bodies[OBJ_IMAGE] = f"<< /Type /XObject /Subtype /Image /ColorSpace /DeviceRGB /Width {img_w} /Height {img_h} /BitsPerComponent 8 /Filter /DCTDecode /Length {len(jpeg_bytes)} >>\nstream\n".encode() + jpeg_bytes + b"\nendstream"
    
    # Separation functions
    tint_func = b"{ pop 0 0 0 0 }"
    for cid, oid in CHANNEL_OBJS.items():
        obj_bodies[oid] = f"<< /FunctionType 4 /Domain [0.0 1.0] /Range [0.0 1.0 0.0 1.0 0.0 1.0 0.0 1.0] /Length {len(tint_func)} >>\nstream\n".encode() + tint_func + b"\nendstream"

    # Pattern Objects
    for p_key, p_data in PATTERN_OBJS.items():
        sz = p_data["size"]; ch = p_data["channel"]
        d_match = re.search(r'd="([^"]+)"', p_data["svg"])
        commands = _svg_path_to_pdf(d_match.group(1), sz) if d_match else ""
        
        # El comando scn dentro del patrón usa el color del spot
        p_stream = f"q\n/CS_{ch['id'].replace(' ', '_')} cs\n1.0 scn\n{commands}\nf*\nQ".encode()
        
        # Matriz: El patrón debe alinearse con el documento. 
        # IMPORTANTE: Movemos el patrón para que no se corte por el flip de Y
        # Como el documento está al revés, a veces el patrón necesita un shift.
        matrix = f"[1 0 0 1 0 0]" 
        
        pdf_name_val = ch.get("label", ch['id']).strip() or ch['id']
        label_safe = pdf_name_val.replace(" ", "#20").replace("(", "#28").replace(")", "#29")
        
        p_hdr = (
            f"<< /Type /Pattern /PatternType 1 /PaintType 1 /TilingType 1 "
            f"/BBox [0 0 {sz} {sz}] /XStep {sz} /YStep {sz} "
            f"/Resources << /ProcSet [/PDF] /ColorSpace << /CS_{ch['id'].replace(' ', '_')} [/Separation /{label_safe} /DeviceCMYK {CHANNEL_OBJS[ch['id']]} 0 R] >> >> "
            f"/Matrix {matrix} /Length {len(p_stream)} >>\nstream\n"
        ).encode()
        obj_bodies[p_data["obj"]] = p_hdr + p_stream + b"\nendstream"

    # Resources
    def _pdf_safe_name(s):
        return s.replace(" ", "#20").replace("(", "#28").replace(")", "#29")

    cs_entries = []
    for ch in channels:
        cid = ch["id"]
        # FIX: Solo incluir canales que realmente tienen objetos definidos si no es preview
        if not preview and cid not in CHANNEL_OBJS:
            continue
        if cid not in por_canal or not por_canal[cid]:
            continue
            
        ch_name = cid.replace(" ", "_")
        pdf_name_val = ch.get("label", cid).strip() or cid
        label_safe = _pdf_safe_name(pdf_name_val)
        
        name_key = f"CS_{ch_name}"
        if preview:
            cs_entries.append(f"/{name_key} [/DeviceRGB]")
        else:
            oid = CHANNEL_OBJS[cid]
            cs_entries.append(f"/{name_key} [/Separation /{label_safe} /DeviceCMYK {oid} 0 R]")
            
    p_entries = [f"/{k} {v['obj']} 0 R" for k, v in PATTERN_OBJS.items()]
    
    res = f"<< /ExtGState << /GSOP {OBJ_GSOP} 0 R >> "
    if cs_entries:
        res += f"/ColorSpace << {' '.join(cs_entries)} >> "
    if p_entries:
        res += f"/Pattern << {' '.join(p_entries)} >> "
    if jpeg_bytes:
        res += f"/XObject << /Im0 {OBJ_IMAGE} 0 R >> "
    res += ">>"
    
    obj_bodies[OBJ_PAGE] = f"<< /Type /Page /Parent {OBJ_PAGES} 0 R /MediaBox [0 0 {ancho} {alto}] /Resources {res} /Contents {OBJ_CONTENT} 0 R >>".encode()
    obj_bodies[OBJ_PAGES] = f"<< /Type /Pages /Kids [{OBJ_PAGE} 0 R] /Count 1 >>".encode()
    obj_bodies[OBJ_CATALOG] = f"<< /Type /Catalog /Pages {OBJ_PAGES} 0 R >>".encode()

    # Final logic...
    buf = bytearray(b"%PDF-1.4\n%\xe2\xe3\xcf\xd3\n")
    offsets = {}
    for oid in sorted(obj_bodies.keys()):
        offsets[oid] = len(buf)
        buf += f"{oid} 0 obj\n".encode() + obj_bodies[oid] + b"\nendobj\n\n"
    
    xref_pos = len(buf); max_id = max(obj_bodies.keys())
    buf += f"xref\n0 {max_id + 1}\n0000000000 65535 f \n".encode()
    for i in range(1, max_id + 1):
        if i in offsets: buf += f"{offsets[i]:010d} 00000 n \n".encode()
        else: buf += b"0000000000 65535 f \n"
    buf += f"trailer\n<< /Size {max_id + 1} /Root {OBJ_CATALOG} 0 R >>\nstartxref\n{xref_pos}\n%%EOF\n".encode()
    
    with open(output_path, "wb") as f: f.write(buf)
    return output_path
