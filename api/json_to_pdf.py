"""
json_to_pdf.py  —  XPRIN-Picasso  (v7.5)
---------------------------------------------------------------
PDF con imagen original + canales Separation UV dinámicos + texturas.

FIXES v7.5:
  - Textura: coords SVG se traducen DIRECTAMENTE (sin cm por tile)
    evita problemas de clip+CTM en RIPs
  - Clip de zona usa W* n (even-odd, igual que los paths del detector)
  - q/Q envuelve TODO el bloque zona (clip + tiles) correctamente
  - El colorspace/valor se emite UNA sola vez antes del loop de tiles
  - Los ops del SVG se pre-convierten a tuplas (coords_list, cmd) para
    traducción rápida sin parsear strings
"""

import io, json, os, re, sys, argparse

try:
    from PIL import Image
    HAS_PILLOW = True
except ImportError:
    HAS_PILLOW = False

MAX_IMG_PX = 2500
KAPPA      = 0.5522847498

_SVG_DIR = os.path.join(os.path.dirname(__file__), "..", "frontend", "public", "texturas")


# ═══════════════════════════════════════════════════════════════════════════════
# NOMBRES PDF
# ═══════════════════════════════════════════════════════════════════════════════

def _pdf_name(text: str) -> str:
    result = []
    for ch in str(text):
        if ch in ('%', '#', '/', ' ', '(', ')', '<', '>', '[', ']', '{', '}'):
            result.append(f"#{ord(ch):02X}")
        else:
            result.append(ch)
    return "".join(result)

def _separation_name(ch: dict) -> str:
    lbl  = (ch.get("label") or "").strip()
    base = ch["id"]
    return _pdf_name(f"{base}_{lbl}" if lbl else base)

def _cs_key(ch: dict) -> str:
    return "CS" + _pdf_name(ch["id"])


# ═══════════════════════════════════════════════════════════════════════════════
# CONVERSIÓN SVG → LISTA DE SHAPES (coords como floats, NO strings)
# ═══════════════════════════════════════════════════════════════════════════════

_CMD_RE = re.compile(r'[MmZzLlHhVvCcSsQqTtAa]')
_ARG_COUNTS = {
    'M':2,'m':2,'L':2,'l':2,'H':1,'h':1,'V':1,'v':1,
    'C':6,'c':6,'S':4,'s':4,'Q':4,'q':4,'T':2,'t':2,
    'A':7,'a':7,'Z':0,'z':0,
}
_NUM_RE = re.compile(r'[+-]?(?:\d*\.\d+|\d+\.?)(?:[eE][+-]?\d+)?')


def _parse_d(d: str):
    tokens = re.findall(
        r'[MmZzLlHhVvCcSsQqTtAa]|[+-]?(?:\d*\.\d+|\d+\.?)(?:[eE][+-]?\d+)?', d)
    result = []; cmd = 'M'; i = 0
    while i < len(tokens):
        t = tokens[i]
        if _CMD_RE.fullmatch(t):
            cmd = t; i += 1
            if _ARG_COUNTS[cmd] == 0: result.append((cmd, []))
        else:
            n = _ARG_COUNTS.get(cmd, 0); args = []; j = i
            while j < len(tokens) and len(args) < n:
                if not _CMD_RE.fullmatch(tokens[j]):
                    args.append(float(tokens[j])); j += 1
                else: break
            if len(args) == n:
                result.append((cmd, args)); i = j
                if cmd == 'M': cmd = 'L'
                elif cmd == 'm': cmd = 'l'
            else: i += 1
    return result


# Cada "punto" del tile es una tupla: ([x0,y0, x1,y1, ...], cmd_str)
# cmd_str: 'm', 'l', 'c', 'h', 're'  (operadores PDF directos)
# Para 'h': coords vacía

def _svg_path_to_points(d: str, sx: float, sy: float) -> list:
    """
    Convierte path SVG a lista de (coords_floats, pdf_cmd).
    coords_floats son las coordenadas ABSOLUTAS del tile en (0,0).
    Para traducir a posición (tx,ty) basta sumar tx a todos los x, ty a todos los y.
    """
    ops_in = _parse_d(d)
    out = []; cx = cy = 0.0; lx = ly = 0.0; sx0 = sy0 = 0.0

    for cmd, args in ops_in:
        if cmd == 'M':
            cx,cy = args[0]*sx, args[1]*sy; sx0,sy0=cx,cy; lx,ly=cx,cy
            out.append(([cx,cy], 'm'))
        elif cmd == 'm':
            cx+=args[0]*sx; cy+=args[1]*sy; sx0,sy0=cx,cy; lx,ly=cx,cy
            out.append(([cx,cy], 'm'))
        elif cmd == 'L':
            cx,cy = args[0]*sx, args[1]*sy; lx,ly=cx,cy
            out.append(([cx,cy], 'l'))
        elif cmd == 'l':
            cx+=args[0]*sx; cy+=args[1]*sy; lx,ly=cx,cy
            out.append(([cx,cy], 'l'))
        elif cmd == 'H':
            cx=args[0]*sx; lx,ly=cx,cy; out.append(([cx,cy], 'l'))
        elif cmd == 'h':
            cx+=args[0]*sx; lx,ly=cx,cy; out.append(([cx,cy], 'l'))
        elif cmd == 'V':
            cy=args[0]*sy; lx,ly=cx,cy; out.append(([cx,cy], 'l'))
        elif cmd == 'v':
            cy+=args[0]*sy; lx,ly=cx,cy; out.append(([cx,cy], 'l'))
        elif cmd == 'C':
            x1,y1,x2,y2,x,y = args
            lx,ly=x2*sx,y2*sy; cx,cy=x*sx,y*sy
            out.append(([x1*sx,y1*sy, lx,ly, cx,cy], 'c'))
        elif cmd == 'c':
            x1,y1,x2,y2,x,y = args
            ax1,ay1=cx+x1*sx,cy+y1*sy; ax2,ay2=cx+x2*sx,cy+y2*sy
            lx,ly=ax2,ay2; cx,cy=cx+x*sx,cy+y*sy
            out.append(([ax1,ay1, ax2,ay2, cx,cy], 'c'))
        elif cmd == 'S':
            x2,y2,x,y = args
            r1x,r1y=2*cx-lx,2*cy-ly; lx,ly=x2*sx,y2*sy; cx,cy=x*sx,y*sy
            out.append(([r1x,r1y, lx,ly, cx,cy], 'c'))
        elif cmd == 's':
            x2,y2,x,y = args
            r1x,r1y=2*cx-lx,2*cy-ly; ax2,ay2=cx+x2*sx,cy+y2*sy
            lx,ly=ax2,ay2; cx,cy=cx+x*sx,cy+y*sy
            out.append(([r1x,r1y, ax2,ay2, cx,cy], 'c'))
        elif cmd == 'Q':
            qx1,qy1,x,y = args
            cp1x=cx+2/3*(qx1*sx-cx); cp1y=cy+2/3*(qy1*sy-cy)
            cp2x=x*sx+2/3*(qx1*sx-x*sx); cp2y=y*sy+2/3*(qy1*sy-y*sy)
            lx,ly=cp2x,cp2y; cx,cy=x*sx,y*sy
            out.append(([cp1x,cp1y,cp2x,cp2y,cx,cy], 'c'))
        elif cmd == 'q':
            qx1,qy1,x,y = args
            aqx1,aqy1=cx+qx1*sx,cy+qy1*sy; ax,ay=cx+x*sx,cy+y*sy
            cp1x=cx+2/3*(aqx1-cx); cp1y=cy+2/3*(aqy1-cy)
            cp2x=ax+2/3*(aqx1-ax); cp2y=ay+2/3*(aqy1-ay)
            lx,ly=cp2x,cp2y; cx,cy=ax,ay
            out.append(([cp1x,cp1y,cp2x,cp2y,cx,cy], 'c'))
        elif cmd in ('Z','z'):
            out.append(([], 'h')); cx,cy=sx0,sy0; lx,ly=cx,cy

    return out


def _attr(tag_str: str, name: str, default=None):
    m = re.search(rf'\b{re.escape(name)}=["\']([^"\']*)["\']', tag_str)
    return m.group(1) if m else default


class TileShape:
    """Una forma del tile: lista de puntos (coords, cmd) + fill_op ('f' o 'f*')."""
    __slots__ = ('points', 'fill_op')
    def __init__(self, points, fill_op='f*'):
        self.points  = points   # list of ([floats...], pdf_cmd)
        self.fill_op = fill_op


def _points_to_pdf_str(points: list, tx: float, ty: float) -> str:
    """
    Convierte lista de (coords, cmd) a string PDF con offset (tx,ty).
    ESTA es la función crítica — no usa cm, traduce coords directamente.
    """
    parts = []
    for coords, cmd in points:
        if cmd == 'h':
            parts.append('h')
        elif cmd in ('m', 'l'):
            parts.append(f"{coords[0]+tx:.3f} {coords[1]+ty:.3f} {cmd}")
        elif cmd == 'c':
            parts.append(
                f"{coords[0]+tx:.3f} {coords[1]+ty:.3f} "
                f"{coords[2]+tx:.3f} {coords[3]+ty:.3f} "
                f"{coords[4]+tx:.3f} {coords[5]+ty:.3f} c")
        elif cmd == 're':
            parts.append(f"{coords[0]+tx:.3f} {coords[1]+ty:.3f} {coords[2]:.3f} {coords[3]:.3f} re")
    return "\n".join(parts)


def _parse_svg_shapes(svg_content: str, tile_size: int) -> list:
    """Lee SVG y devuelve lista de TileShape escalados a tile_size."""
    vb = _attr(svg_content, 'viewBox') or ''
    parts = vb.split()
    if len(parts) == 4:
        vb_w, vb_h = float(parts[2]), float(parts[3])
    else:
        m = re.search(r'width=["\'](\d+(?:\.\d+)?)', svg_content)
        vb_w = float(m.group(1)) if m else 32.0
        m = re.search(r'height=["\'](\d+(?:\.\d+)?)', svg_content)
        vb_h = float(m.group(1)) if m else 32.0

    sx = tile_size / vb_w
    sy = tile_size / vb_h
    shapes = []

    # paths
    for m in re.finditer(r'<path([^>]+)/?>', svg_content, re.I):
        a = m.group(1)
        if 'fill="none"' in a or "fill='none'" in a: continue
        d = _attr(a, 'd') or ''
        if not d: continue
        pts = _svg_path_to_points(d, sx, sy)
        if pts: shapes.append(TileShape(pts, 'f*'))

    # polygons
    for m in re.finditer(r'<polygon([^>]+)/?>', svg_content, re.I):
        a = m.group(1)
        if 'fill="none"' in a or "fill='none'" in a: continue
        pts_str = _attr(a, 'points') or ''
        nums = [float(n) for n in _NUM_RE.findall(pts_str)]
        if len(nums) < 4: continue
        pts = [([nums[0]*sx, nums[1]*sy], 'm')]
        for i in range(2, len(nums)-1, 2):
            pts.append(([nums[i]*sx, nums[i+1]*sy], 'l'))
        pts.append(([], 'h'))
        shapes.append(TileShape(pts, 'f*'))

    # rects
    for m in re.finditer(r'<rect([^>]+)/?>', svg_content, re.I):
        a = m.group(1)
        if 'fill="none"' in a or "fill='none'" in a: continue
        try:
            rx=float(_attr(a,'x') or 0); ry=float(_attr(a,'y') or 0)
            rw=float(_attr(a,'width') or 0); rh=float(_attr(a,'height') or 0)
            if rw > 0 and rh > 0:
                # re operator: x y w h re — width y height NO se traducen
                shapes.append(TileShape([([rx*sx, ry*sy, rw*sx, rh*sy], 're')], 'f'))
        except (ValueError, TypeError): pass

    # circles → 4 beziers cúbicas
    for m in re.finditer(r'<circle([^>]+)/?>', svg_content, re.I):
        a = m.group(1)
        if 'fill="none"' in a or "fill='none'" in a: continue
        try:
            ccx=float(_attr(a,'cx') or 0); ccy=float(_attr(a,'cy') or 0)
            cr=float(_attr(a,'r') or 0)
            if cr <= 0: continue
            cx_p=ccx*sx; cy_p=ccy*sy; rx=cr*sx; ry=cr*sy
            kx=KAPPA*rx; ky=KAPPA*ry
            pts = [
                ([cx_p-rx, cy_p], 'm'),
                ([cx_p-rx, cy_p-ky, cx_p-kx, cy_p-ry, cx_p, cy_p-ry], 'c'),
                ([cx_p+kx, cy_p-ry, cx_p+rx, cy_p-ky, cx_p+rx, cy_p], 'c'),
                ([cx_p+rx, cy_p+ky, cx_p+kx, cy_p+ry, cx_p, cy_p+ry], 'c'),
                ([cx_p-kx, cy_p+ry, cx_p-rx, cy_p+ky, cx_p-rx, cy_p], 'c'),
                ([], 'h'),
            ]
            shapes.append(TileShape(pts, 'f'))
        except (ValueError, TypeError): pass

    return shapes


def _load_svg_shapes(textura_id: str, tile_size: int):
    svg_file = os.path.join(_SVG_DIR, f"{textura_id}.svg")
    if not os.path.isfile(svg_file):
        return None
    try:
        with open(svg_file, 'r', encoding='utf-8', errors='replace') as f:
            svg = f.read()
    except Exception:
        return None
    shapes = _parse_svg_shapes(svg, tile_size)
    return shapes if shapes else None


# ═══════════════════════════════════════════════════════════════════════════════
# EMISIÓN DE ZONA TEXTURIZADA
# ═══════════════════════════════════════════════════════════════════════════════

def _emit_tiled_zone(
    forma_bytes: bytes,
    bbox: dict,
    shapes: list,
    tile_size: int,
    tile_gap: int,
    ink_val: float,
    cs_name: str,
    preview_color,   # tuple (r,g,b) o None
    gsop: bool,
) -> bytes:
    """
    Emite el stream de una zona con textura:
      q
        <zona> W* n         ← clip even-odd
        /GSOP gs            ← overprint (si no preview)
        /CS cs  ink scn     ← colorspace + tinta (UNA sola vez)
        <tiles con coords traducidas>
      Q
    """
    step = max(2, tile_size + tile_gap)
    bx   = float(bbox.get("x", 0))
    by   = float(bbox.get("y", 0))
    bw   = float(bbox.get("w", tile_size))
    bh   = float(bbox.get("h", tile_size))

    buf = bytearray()
    buf += b"q\n"
    buf += forma_bytes          # paths de la zona (para clip)
    buf += b"W* n\n"            # clip even-odd, sin pintar

    if gsop:
        buf += b"/GSOP gs\n"
    buf += f"/{cs_name} cs\n".encode()
    if preview_color:
        r, g, b = preview_color
        buf += f"{r:.4f} {g:.4f} {b:.4f} scn\n".encode()
    else:
        buf += f"{ink_val:.4f} scn\n".encode()

    # Loop de tiles — coords traducidas directamente sin cm
    tiles_x_start = int(bx // step) - 1
    tiles_x_end   = int((bx + bw) // step) + 2
    tiles_y_start = int(by // step) - 1
    tiles_y_end   = int((by + bh) // step) + 2

    for ty_i in range(tiles_y_start, tiles_y_end):
        for tx_i in range(tiles_x_start, tiles_x_end):
            tx = float(tx_i * step)
            ty = float(ty_i * step)
            # Saltar tiles completamente fuera del bbox
            if tx + tile_size < bx or tx > bx + bw: continue
            if ty + tile_size < by or ty > by + bh: continue

            for shape in shapes:
                pdf_str = _points_to_pdf_str(shape.points, tx, ty)
                if pdf_str.strip():
                    buf += (pdf_str + "\n" + shape.fill_op + "\n").encode()

    buf += b"Q\n\n"
    return bytes(buf)


# ═══════════════════════════════════════════════════════════════════════════════
# IMAGEN
# ═══════════════════════════════════════════════════════════════════════════════

def _abrir_sobre_blanco(imagen_path):
    img = Image.open(imagen_path)
    if img.mode == "P": img = img.convert("RGBA")
    elif img.mode not in ("RGBA","RGB","LA","L"): img = img.convert("RGBA")
    if img.mode in ("RGBA","LA"):
        fondo = Image.new("RGB", img.size, (255,255,255))
        if img.mode == "LA": img = img.convert("RGBA")
        fondo.paste(img, mask=img.split()[3])
        return fondo
    return img.convert("RGB")

def _preparar_jpeg(imagen_path):
    if not HAS_PILLOW or not os.path.isfile(imagen_path): return None, 0, 0
    img = _abrir_sobre_blanco(imagen_path)
    w, h = img.size
    if w > MAX_IMG_PX or h > MAX_IMG_PX:
        ratio = min(MAX_IMG_PX/w, MAX_IMG_PX/h)
        img = img.resize((int(w*ratio),int(h*ratio)), Image.LANCZOS)
    iw, ih = img.size
    buf = io.BytesIO(); img.save(buf, format="JPEG", quality=95, optimize=True)
    return buf.getvalue(), iw, ih


# ═══════════════════════════════════════════════════════════════════════════════
# MIGRACIÓN / HELPERS
# ═══════════════════════════════════════════════════════════════════════════════

_VIEJO_A_NUEVO = {"w1":"SPOT_1","w2":"SPOT_2","texture":"SPOT_1"}

def _migrar_capas(capas):
    out = []
    for capa in capas:
        if isinstance(capa.get("spots"), list): out.append(capa); continue
        spot_viejo = capa.get("spot")
        spots = ([{"channelId": _VIEJO_A_NUEVO[spot_viejo]}]
                 if spot_viejo and spot_viejo in _VIEJO_A_NUEVO else [])
        out.append({**capa, "spots": spots})
    return out

def _default_spot_channels(capas):
    ids_vistos = set(); channels = []
    for capa in capas:
        for sp in (capa.get("spots") or []):
            cid = sp.get("channelId","")
            if cid and cid not in ids_vistos:
                ids_vistos.add(cid)
                channels.append({"id":cid,"label":"","inkAmount":100,"color":"#a0a0ab"})
    return channels or [{"id":"SPOT_1","label":"","inkAmount":100,"color":"#a0a0ab"}]

def _hex_rgb(color):
    c = (color or "").strip().lower().lstrip("#")
    if len(c)==3: c="".join(x*2 for x in c)
    if len(c)!=6: return (0.63,0.63,0.69)
    try: return (int(c[0:2],16)/255, int(c[2:4],16)/255, int(c[4:6],16)/255)
    except ValueError: return (0.63,0.63,0.69)

def _forma_bytes(forma):
    out = []
    for cmd in forma:
        t = cmd.get("tipo", "")
        if   t=="moveto":   out.append(f"{cmd['x']:.3f} {cmd['y']:.3f} m\n")
        elif t=="lineto":   out.append(f"{cmd['x']:.3f} {cmd['y']:.3f} l\n")
        elif t=="curveto":  out.append(f"{cmd['x1']:.3f} {cmd['y1']:.3f} "
                                       f"{cmd['x2']:.3f} {cmd['y2']:.3f} "
                                       f"{cmd['x']:.3f} {cmd['y']:.3f} c\n")
        elif t=="closepath": out.append("h\n")
    return "".join(out).encode("ascii")


def _bbox_from_forma(forma):
    xs, ys = [], []
    for cmd in forma:
        t = cmd.get("tipo", "")
        if t in ("moveto", "lineto"):
            xs.append(float(cmd.get("x", 0)))
            ys.append(float(cmd.get("y", 0)))
        elif t == "curveto":
            xs.extend([float(cmd.get("x1", 0)), float(cmd.get("x2", 0)), float(cmd.get("x", 0))])
            ys.extend([float(cmd.get("y1", 0)), float(cmd.get("y2", 0)), float(cmd.get("y", 0))])
    if not xs or not ys:
        return None
    x0, y0, x1, y1 = min(xs), min(ys), max(xs), max(ys)
    return {"x": x0, "y": y0, "w": max(0.0, x1 - x0), "h": max(0.0, y1 - y0)}


# ═══════════════════════════════════════════════════════════════════════════════
# GENERADOR PRINCIPAL — v7.5
# ═══════════════════════════════════════════════════════════════════════════════

def generar_pdf_nativo(datos, imagen_path=None, output_path="output.pdf",
                       preview=False, embed_imagen=True):
    doc   = datos["documento"]
    ancho = int(doc["ancho"]); alto = int(doc["alto"])

    capas         = _migrar_capas(datos.get("capas", []))
    spot_channels = datos.get("spotChannels") or _default_spot_channels(capas)

    por_canal = {ch["id"]: [] for ch in spot_channels}
    for capa in capas:
        if not capa.get("visible", True): continue
        for sp in (capa.get("spots") or []):
            cid = sp.get("channelId","")
            if cid in por_canal:
                por_canal[cid].append((capa, sp))

    canales_activos = [ch for ch in spot_channels if por_canal.get(ch["id"])]
    if not canales_activos:
        raise RuntimeError("No hay capas con spot asignado para generar el PDF.")

    svg_cache = {}

    # ── IDs de objetos ─────────────────────────────────────────────────────────
    N = len(canales_activos)
    OBJ_CATALOG = 1; OBJ_PAGES = 2; OBJ_PAGE = 3; OBJ_GSOP = 4
    tint_ids    = {ch["id"]: 5+i for i,ch in enumerate(canales_activos)}
    OBJ_CONTENT = 5 + N
    OBJ_IMAGE   = 5 + N + 1

    # ── Imagen ─────────────────────────────────────────────────────────────────
    jpeg_bytes = None; img_w = img_h = 0
    if embed_imagen and imagen_path and HAS_PILLOW:
        jpeg_bytes, img_w, img_h = _preparar_jpeg(imagen_path)

    # ── Content stream ─────────────────────────────────────────────────────────
    cs = bytearray()
    cs += f"q\n1 1 1 rg\n0 0 {ancho} {alto} re\nf\nQ\n\n".encode()
    if jpeg_bytes:
        cs += f"q\n{ancho} 0 0 {alto} 0 0 cm\n/Im0 Do\nQ\n\n".encode()

    for ch in canales_activos:
        cid  = ch["id"]
        key  = _cs_key(ch)
        ink  = max(0.0, min(1.0, ch.get("inkAmount", 100) / 100.0))
        prev = _hex_rgb(ch.get("color","#a0a0ab")) if preview else None

        for capa, sp in por_canal[cid]:
            tid = sp.get("texturaId")
            ts  = int(sp.get("tileSize", 80))
            tg  = int(sp.get("tileGap",  0))

            shapes = None
            if tid:
                cache_key = (tid, ts)
                if cache_key not in svg_cache:
                    svg_cache[cache_key] = _load_svg_shapes(tid, ts)
                shapes = svg_cache[cache_key]
                if shapes is None:
                    print(f"  [AVISO] No se encontró SVG para textura '{tid}' — relleno sólido")

            for zona in capa.get("zonas", []):
                fb = _forma_bytes(zona.get("forma", []))
                if not fb.strip(): continue

                if shapes:
                    bbox_user = zona.get("bbox")
                    bbox_forma = _bbox_from_forma(zona.get("forma", []))
                    if bbox_forma is None:
                        bbox = bbox_user or {"x":0,"y":0,"w":ancho,"h":alto}
                    else:
                        if bbox_user:
                            # Unir caja pre-calculada y geometría exacta.
                            x0 = min(bbox_user.get("x",0), bbox_forma["x"])
                            y0 = min(bbox_user.get("y",0), bbox_forma["y"])
                            x1 = max(bbox_user.get("x",0)+bbox_user.get("w",0), bbox_forma["x"]+bbox_forma["w"])
                            y1 = max(bbox_user.get("y",0)+bbox_user.get("h",0), bbox_forma["y"]+bbox_forma["h"])
                            bbox = {"x":x0, "y":y0, "w":x1-x0, "h":y1-y0}
                        else:
                            bbox = bbox_forma

                    # Ensamblar margen extra para evitar recorte por bordes de tiles.
                    margin = max(ts, tg, 1)
                    bbox = {
                        "x": max(0, bbox.get("x",0) - margin),
                        "y": max(0, bbox.get("y",0) - margin),
                        "w": bbox.get("w",0) + 2*margin,
                        "h": bbox.get("h",0) + 2*margin,
                    }

                    cs += _emit_tiled_zone(
                        fb, bbox, shapes, ts, tg, ink, key, prev,
                        gsop=(not preview)
                    )
                else:
                    cs += b"q\n"
                    if not preview: cs += b"/GSOP gs\n"
                    cs += f"/{key} cs\n".encode()
                    if preview:
                        r,g,b = _hex_rgb(ch.get("color","#a0a0ab"))
                        cs += f"{r:.4f} {g:.4f} {b:.4f} scn\n".encode()
                    else:
                        cs += f"{ink:.4f} scn\n".encode()
                    cs += fb
                    cs += b"f\nQ\n\n"

    content_bytes = bytes(cs)

    # ── Objetos PDF ────────────────────────────────────────────────────────────
    obj_bodies = {}

    tint_stream = b"{ pop 0 0 0 0 }"
    tint_hdr = (
        f"<< /FunctionType 4 /Domain [0.0 1.0]"
        f" /Range [0.0 1.0 0.0 1.0 0.0 1.0 0.0 1.0]"
        f" /Length {len(tint_stream)} >>\nstream\n"
    ).encode()
    for ch in canales_activos:
        obj_bodies[tint_ids[ch["id"]]] = tint_hdr + tint_stream + b"\nendstream"

    obj_bodies[OBJ_GSOP]    = b"<< /Type /ExtGState /OP true /op true /OPM 1 >>"
    obj_bodies[OBJ_CONTENT] = (
        f"<< /Length {len(content_bytes)} >>\nstream\n"
    ).encode() + content_bytes + b"\nendstream"

    if jpeg_bytes:
        obj_bodies[OBJ_IMAGE] = (
            f"<< /Type /XObject /Subtype /Image /ColorSpace /DeviceRGB"
            f" /Width {img_w} /Height {img_h}"
            f" /BitsPerComponent 8 /Filter /DCTDecode /Length {len(jpeg_bytes)} >>\nstream\n"
        ).encode() + jpeg_bytes + b"\nendstream"

    cs_entries = []
    for ch in canales_activos:
        k = _cs_key(ch); name = _separation_name(ch); tid = tint_ids[ch["id"]]
        if preview:
            cs_entries.append(f"      /{k} [/DeviceRGB]")
        else:
            cs_entries.append(f"      /{k} [/Separation /{name} /DeviceCMYK {tid} 0 R]")

    xobj = f"\n      /XObject << /Im0 {OBJ_IMAGE} 0 R >>" if jpeg_bytes else ""
    resources = (
        f"    /Resources <<\n"
        f"      /ExtGState << /GSOP {OBJ_GSOP} 0 R >>\n"
        f"      /ColorSpace <<\n" + "\n".join(cs_entries) + "\n      >>"
        + xobj + "\n    >>"
    )

    obj_bodies[OBJ_PAGE] = (
        f"<< /Type /Page\n   /Parent {OBJ_PAGES} 0 R\n"
        f"   /MediaBox [0 0 {ancho} {alto}]\n{resources}\n"
        f"   /Contents {OBJ_CONTENT} 0 R\n>>"
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

    xref_pos = len(buf); max_id = max(obj_bodies.keys())
    buf += f"xref\n0 {max_id+1}\n".encode()
    buf += b"0000000000 65535 f \n"
    for i in range(1, max_id+1):
        buf += (f"{offsets[i]:010d} 00000 n \n".encode()
                if i in offsets else b"0000000000 65535 f \n")
    buf += (
        f"trailer\n<< /Size {max_id+1} /Root {OBJ_CATALOG} 0 R >>\n"
        f"startxref\n{xref_pos}\n%%EOF\n"
    ).encode()

    with open(output_path, "wb") as f: f.write(buf)

    area_total = ancho * alto or 1
    print(f"  [PDF v7.5] {len(canales_activos)} spot(s), {os.path.getsize(output_path)//1024} KB")
    for ch in canales_activos:
        lista = por_canal[ch["id"]]
        pct   = 100 * sum(c.get("area_px",0) for c,_ in lista) / area_total
        has_t = any(s.get("texturaId") for _,s in lista)
        print(f"    /{_separation_name(ch):<25}  {len(lista):>2} capa(s)  {pct:.1f}%"
              + ("  [textura]" if has_t else ""))

    return output_path


def generar_pdf(datos, imagen_path, output_path, preview=False,
                conservar_ps=False, embed_imagen=True, gs_bin=None):
    return generar_pdf_nativo(datos, imagen_path, output_path,
                              preview=preview, embed_imagen=embed_imagen)


# ═══════════════════════════════════════════════════════════════════════════════
# CLI
# ═══════════════════════════════════════════════════════════════════════════════

def main():
    parser = argparse.ArgumentParser(
        description="XPRIN-Picasso v7.5 — JSON → PDF imagen + spots UV + texturas")
    parser.add_argument("json")
    parser.add_argument("--imagen",    "-i")
    parser.add_argument("--output",    "-o")
    parser.add_argument("--preview",         action="store_true")
    parser.add_argument("--sin-imagen",      action="store_true")
    args = parser.parse_args()

    print(f"\n{'='*60}\n  XPRIN-Picasso — JSON → PDF  (v7.5)\n{'='*60}")
    with open(args.json, "r", encoding="utf-8") as f:
        datos = json.load(f)

    embed_img   = not args.sin_imagen
    imagen_path = args.imagen
    if not imagen_path and embed_img:
        json_dir = os.path.dirname(os.path.abspath(args.json))
        for ext in (".png",".jpg",".jpeg",".webp"):
            cand = os.path.join(json_dir, datos.get("id","imagen") + ext)
            if os.path.isfile(cand): imagen_path = cand; break

    pdf_path = args.output or os.path.splitext(args.json)[0] + "_spots.pdf"
    try:
        generar_pdf(datos, imagen_path, pdf_path,
                    preview=args.preview, embed_imagen=embed_img)
        print(f"\n[OK] {pdf_path}")
    except Exception:
        import traceback; traceback.print_exc(); sys.exit(1)

if __name__ == "__main__":
    main()
