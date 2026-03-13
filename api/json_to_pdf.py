"""
json_to_pdf.py  —  XPRIN-Picasso  (v7.8)
---------------------------------------------------------------
PDF con imagen original + canales Separation UV dinámicos + texturas.

FIXES v7.8 — FIX DEFINITIVO DE ALINEACIÓN DE TILES:
  El editor tila desde SVG y=0 (arriba del documento, Y↓).
  PDF tiene Y↑ (origen abajo). El loop anterior iteraba en espacio
  PDF (ty = ty_i * step desde abajo), lo que producía un desfase de
  `alto % step` pixels respecto al editor.

  Fix: el loop ahora itera en espacio SVG Y-down (igual que el editor):
    ty_svg_top = ty_i * step   (distancia desde la cima del documento)
    ty_pdf     = alto - ty_svg_top - tile_size   (bottom del tile en PDF Y-up)

  Así el tile i=0 empieza exactamente en SVG y=0 (arriba) = PDF y=alto-tile_size
  y la cuadrícula está en fase con lo que pinta el navegador.

  La bbox pasa a convertirse de PDF Y-up → SVG Y-down solo para calcular
  el rango de tiles; las coordenadas que se escriben al PDF siguen siendo Y-up.

FIXES v7.7:
  - Escalado UNIFORME de texturas SVG (preserveAspectRatio xMidYMid meet):
      s = min(tile_size/vb_w, tile_size/vb_h)
      ox = (tile_size - vb_w*s)/2, oy = (tile_size - vb_h*s)/2

FIXES v7.6:
  - Y-flip correcto SVG(Y↓)→PDF(Y↑) en _points_to_pdf_str:
      y_pdf = (tile_h - y_tile) + ty_pdf_bottom

FIXES v7.5:
  - Coords SVG inline sin cm (compatible RIPs), clip W* n, q/Q correcto.
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
# CONVERSIÓN SVG → LISTA DE SHAPES
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


def _attr(tag_str: str, name: str, default=None):
    m = re.search(rf'\b{re.escape(name)}=["\']([^"\']*)["\']', tag_str)
    return m.group(1) if m else default


def _svg_path_to_points(d: str, s: float, ox: float, oy: float) -> list:
    """
    Convierte path SVG a lista de (coords_floats, pdf_cmd).
    Escala uniforme s, centrado (ox, oy).
    Coordenadas en espacio de tile Y-down (0..tile_size).
    El flip Y→PDF ocurre en _points_to_pdf_str.
    """
    ops_in = _parse_d(d)
    out = []; cx = cy = 0.0; lx = ly = 0.0; sx0 = sy0 = 0.0

    def _X(v): return v * s + ox
    def _Y(v): return v * s + oy
    def _x(v): return v * s
    def _y(v): return v * s

    for cmd, args in ops_in:
        if cmd == 'M':
            cx,cy = _X(args[0]),_Y(args[1]); sx0,sy0=cx,cy; lx,ly=cx,cy
            out.append(([cx,cy], 'm'))
        elif cmd == 'm':
            cx+=_x(args[0]); cy+=_y(args[1]); sx0,sy0=cx,cy; lx,ly=cx,cy
            out.append(([cx,cy], 'm'))
        elif cmd == 'L':
            cx,cy = _X(args[0]),_Y(args[1]); lx,ly=cx,cy
            out.append(([cx,cy], 'l'))
        elif cmd == 'l':
            cx+=_x(args[0]); cy+=_y(args[1]); lx,ly=cx,cy
            out.append(([cx,cy], 'l'))
        elif cmd == 'H':
            cx=_X(args[0]); lx,ly=cx,cy; out.append(([cx,cy], 'l'))
        elif cmd == 'h':
            cx+=_x(args[0]); lx,ly=cx,cy; out.append(([cx,cy], 'l'))
        elif cmd == 'V':
            cy=_Y(args[0]); lx,ly=cx,cy; out.append(([cx,cy], 'l'))
        elif cmd == 'v':
            cy+=_y(args[0]); lx,ly=cx,cy; out.append(([cx,cy], 'l'))
        elif cmd == 'C':
            x1,y1,x2,y2,x,y = args
            lx,ly=_X(x2),_Y(y2); cx,cy=_X(x),_Y(y)
            out.append(([_X(x1),_Y(y1),lx,ly,cx,cy], 'c'))
        elif cmd == 'c':
            x1,y1,x2,y2,x,y = args
            ax1,ay1=cx+_x(x1),cy+_y(y1); ax2,ay2=cx+_x(x2),cy+_y(y2)
            lx,ly=ax2,ay2; cx,cy=cx+_x(x),cy+_y(y)
            out.append(([ax1,ay1,ax2,ay2,cx,cy], 'c'))
        elif cmd == 'S':
            x2,y2,x,y = args
            r1x,r1y=2*cx-lx,2*cy-ly; lx,ly=_X(x2),_Y(y2); cx,cy=_X(x),_Y(y)
            out.append(([r1x,r1y,lx,ly,cx,cy], 'c'))
        elif cmd == 's':
            x2,y2,x,y = args
            r1x,r1y=2*cx-lx,2*cy-ly; ax2,ay2=cx+_x(x2),cy+_y(y2)
            lx,ly=ax2,ay2; cx,cy=cx+_x(x),cy+_y(y)
            out.append(([r1x,r1y,ax2,ay2,cx,cy], 'c'))
        elif cmd == 'Q':
            qx1,qy1,x,y = args
            aqx1,aqy1=_X(qx1),_Y(qy1); ax,ay=_X(x),_Y(y)
            cp1x=cx+2/3*(aqx1-cx); cp1y=cy+2/3*(aqy1-cy)
            cp2x=ax+2/3*(aqx1-ax); cp2y=ay+2/3*(aqy1-ay)
            lx,ly=cp2x,cp2y; cx,cy=ax,ay
            out.append(([cp1x,cp1y,cp2x,cp2y,cx,cy], 'c'))
        elif cmd == 'q':
            qx1,qy1,x,y = args
            aqx1,aqy1=cx+_x(qx1),cy+_y(qy1); ax,ay=cx+_x(x),cy+_y(y)
            cp1x=cx+2/3*(aqx1-cx); cp1y=cy+2/3*(aqy1-cy)
            cp2x=ax+2/3*(aqx1-ax); cp2y=ay+2/3*(aqy1-ay)
            lx,ly=cp2x,cp2y; cx,cy=ax,ay
            out.append(([cp1x,cp1y,cp2x,cp2y,cx,cy], 'c'))
        elif cmd in ('Z','z'):
            out.append(([],'h')); cx,cy=sx0,sy0; lx,ly=cx,cy

    return out


class TileShape:
    __slots__ = ('points', 'fill_op')
    def __init__(self, points, fill_op='f*'):
        self.points  = points
        self.fill_op = fill_op


def _points_to_pdf_str(points: list, tx: float, ty_pdf: float, tile_h: float) -> str:
    """
    Convierte lista de (coords, cmd) → string de operadores PDF.

    tx      : offset X del tile (igual en ambos espacios).
    ty_pdf  : esquina INFERIOR del tile en espacio PDF Y-up.
    tile_h  : altura del tile (tile_size).

    Flip Y tile→PDF:
      y_pdf_point = (tile_h - y_tile) + ty_pdf
    Para 'c': flip en los 3 pares de puntos de control.
    Para 're': y_bottom_pdf = (tile_h - y_top_tile - h) + ty_pdf
    """
    parts = []
    for coords, cmd in points:
        if cmd == 'h':
            parts.append('h')

        elif cmd in ('m', 'l'):
            x = coords[0] + tx
            y = (tile_h - coords[1]) + ty_pdf
            parts.append(f"{x:.3f} {y:.3f} {cmd}")

        elif cmd == 'c':
            y0 = (tile_h - coords[1]) + ty_pdf
            y1 = (tile_h - coords[3]) + ty_pdf
            y2 = (tile_h - coords[5]) + ty_pdf
            parts.append(
                f"{coords[0]+tx:.3f} {y0:.3f} "
                f"{coords[2]+tx:.3f} {y1:.3f} "
                f"{coords[4]+tx:.3f} {y2:.3f} c")

        elif cmd == 're':
            # y_bottom en PDF = (tile_h - y_top_tile - h) + ty_pdf
            y = (tile_h - coords[1] - coords[3]) + ty_pdf
            parts.append(f"{coords[0]+tx:.3f} {y:.3f} {coords[2]:.3f} {coords[3]:.3f} re")

    return "\n".join(parts)


def _get_viewbox(svg_content: str):
    vb = _attr(svg_content, 'viewBox') or ''
    parts = vb.split()
    if len(parts) == 4:
        return float(parts[2]), float(parts[3])
    m = re.search(r'width=["\'](\d+(?:\.\d+)?)', svg_content)
    vb_w = float(m.group(1)) if m else 32.0
    m = re.search(r'height=["\'](\d+(?:\.\d+)?)', svg_content)
    vb_h = float(m.group(1)) if m else 32.0
    return vb_w, vb_h


def _parse_svg_shapes(svg_content: str, tile_size: int) -> list:
    """
    Lee SVG y devuelve lista de TileShape.
    Escala uniforme (preserveAspectRatio xMidYMid meet) + centrado.
    """
    vb_w, vb_h = _get_viewbox(svg_content)

    s  = min(tile_size / vb_w, tile_size / vb_h)
    ox = (tile_size - vb_w * s) / 2
    oy = (tile_size - vb_h * s) / 2

    shapes = []

    for m in re.finditer(r'<path([^>]+)/?>', svg_content, re.I):
        a = m.group(1)
        if 'fill="none"' in a or "fill='none'" in a: continue
        d = _attr(a, 'd') or ''
        if not d: continue
        pts = _svg_path_to_points(d, s, ox, oy)
        if pts: shapes.append(TileShape(pts, 'f*'))

    for m in re.finditer(r'<polygon([^>]+)/?>', svg_content, re.I):
        a = m.group(1)
        if 'fill="none"' in a or "fill='none'" in a: continue
        pts_str = _attr(a, 'points') or ''
        nums = [float(n) for n in _NUM_RE.findall(pts_str)]
        if len(nums) < 4: continue
        pts = [([nums[0]*s+ox, nums[1]*s+oy], 'm')]
        for i in range(2, len(nums)-1, 2):
            pts.append(([nums[i]*s+ox, nums[i+1]*s+oy], 'l'))
        pts.append(([], 'h'))
        shapes.append(TileShape(pts, 'f*'))

    for m in re.finditer(r'<rect([^>]+)/?>', svg_content, re.I):
        a = m.group(1)
        if 'fill="none"' in a or "fill='none'" in a: continue
        try:
            rx=float(_attr(a,'x') or 0); ry=float(_attr(a,'y') or 0)
            rw=float(_attr(a,'width') or 0); rh=float(_attr(a,'height') or 0)
            if rw>0 and rh>0:
                shapes.append(TileShape([([rx*s+ox, ry*s+oy, rw*s, rh*s], 're')], 'f'))
        except (ValueError, TypeError): pass

    for m in re.finditer(r'<circle([^>]+)/?>', svg_content, re.I):
        a = m.group(1)
        if 'fill="none"' in a or "fill='none'" in a: continue
        try:
            ccx=float(_attr(a,'cx') or 0); ccy=float(_attr(a,'cy') or 0)
            cr =float(_attr(a,'r')  or 0)
            if cr<=0: continue
            cpx=ccx*s+ox; cpy=ccy*s+oy; rr=cr*s; k=KAPPA*rr
            pts=[
                ([cpx,     cpy-rr], 'm'),
                ([cpx+k,   cpy-rr, cpx+rr, cpy-k, cpx+rr, cpy    ], 'c'),
                ([cpx+rr,  cpy+k,  cpx+k,  cpy+rr, cpx,   cpy+rr ], 'c'),
                ([cpx-k,   cpy+rr, cpx-rr, cpy+k,  cpx-rr, cpy   ], 'c'),
                ([cpx-rr,  cpy-k,  cpx-k,  cpy-rr, cpx,   cpy-rr ], 'c'),
                ([], 'h'),
            ]
            shapes.append(TileShape(pts, 'f'))
        except (ValueError, TypeError): pass

    return shapes


def _load_svg_shapes(textura_id: str, tile_size: int):
    svg_file = os.path.join(_SVG_DIR, f"{textura_id}.svg")
    if not os.path.isfile(svg_file): return None
    try:
        with open(svg_file, 'r', encoding='utf-8', errors='replace') as f:
            svg = f.read()
    except Exception: return None
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
    preview_color,
    gsop: bool,
    doc_alto: float,        # ← altura del documento (necesaria para Y-flip del grid)
) -> bytes:
    """
    Emite stream de zona texturizada con grid de tiles alineado igual que el editor.

    SISTEMA DE COORDENADAS:
      - bbox: en espacio PDF Y-up (mismo que las coordenadas de forma).
      - Loop de tiles: en espacio SVG Y-down (igual que el navegador tila).
          ty_svg_top = ty_i * step   (distancia desde arriba del documento)
      - Conversión para escribir al PDF:
          ty_pdf = doc_alto - ty_svg_top - tile_size   (bottom del tile en PDF Y-up)
      - Dentro de cada tile, _points_to_pdf_str aplica:
          y_pdf_point = (tile_h - y_tile) + ty_pdf
                      = tile_size - y_local + doc_alto - ty_svg_top - tile_size
                      = doc_alto - (y_local + ty_svg_top)
                      = doc_alto - y_svg_doc   ✓  (idéntico al navegador)
    """
    step = max(2, tile_size + tile_gap)

    # bbox en PDF Y-up
    bx    = float(bbox.get("x", 0))
    by_pdf = float(bbox.get("y", 0))
    bw    = float(bbox.get("w", tile_size))
    bh_pdf = float(bbox.get("h", tile_size))

    # Convertir bbox a SVG Y-down para el rango del loop
    # top_svg  = doc_alto - (by_pdf + bh_pdf)   ← y más pequeño desde arriba
    # bottom_svg = doc_alto - by_pdf
    by_svg = doc_alto - (by_pdf + bh_pdf)
    bh_svg = bh_pdf   # la altura no cambia

    buf = bytearray()
    buf += b"q\n"
    buf += forma_bytes
    buf += b"W* n\n"

    if gsop:
        buf += b"/GSOP gs\n"
    buf += f"/{cs_name} cs\n".encode()
    if preview_color:
        r, g, b = preview_color
        buf += f"{r:.4f} {g:.4f} {b:.4f} scn\n".encode()
    else:
        buf += f"{ink_val:.4f} scn\n".encode()

    tile_h = float(tile_size)

    # Loop X — sin cambios (X es igual en ambos espacios)
    tiles_x_start = int(bx // step) - 1
    tiles_x_end   = int((bx + bw) // step) + 2

    # Loop Y — en espacio SVG Y-down (misma fase que el editor)
    tiles_y_start = int(by_svg // step) - 1
    tiles_y_end   = int((by_svg + bh_svg) // step) + 2

    for ty_i in range(tiles_y_start, tiles_y_end):
        ty_svg_top = float(ty_i * step)   # top del tile en SVG Y-down

        # Saltar tiles completamente fuera del bbox (en SVG space)
        if ty_svg_top + tile_size < by_svg: continue
        if ty_svg_top > by_svg + bh_svg:   continue

        # Esquina inferior del tile en PDF Y-up
        ty_pdf = doc_alto - ty_svg_top - tile_size

        for tx_i in range(tiles_x_start, tiles_x_end):
            tx = float(tx_i * step)
            if tx + tile_size < bx or tx > bx + bw: continue

            for shape in shapes:
                pdf_str = _points_to_pdf_str(shape.points, tx, ty_pdf, tile_h)
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
    if not HAS_PILLOW or not os.path.isfile(imagen_path): return None,0,0
    img = _abrir_sobre_blanco(imagen_path)
    w,h = img.size
    if w>MAX_IMG_PX or h>MAX_IMG_PX:
        ratio = min(MAX_IMG_PX/w, MAX_IMG_PX/h)
        img = img.resize((int(w*ratio),int(h*ratio)), Image.LANCZOS)
    iw,ih = img.size
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
        t = cmd.get("tipo","")
        if   t=="moveto":    out.append(f"{cmd['x']:.3f} {cmd['y']:.3f} m\n")
        elif t=="lineto":    out.append(f"{cmd['x']:.3f} {cmd['y']:.3f} l\n")
        elif t=="curveto":   out.append(f"{cmd['x1']:.3f} {cmd['y1']:.3f} "
                                        f"{cmd['x2']:.3f} {cmd['y2']:.3f} "
                                        f"{cmd['x']:.3f} {cmd['y']:.3f} c\n")
        elif t=="closepath": out.append("h\n")
    return "".join(out).encode("ascii")

def _bbox_from_forma(forma):
    xs,ys=[],[]
    for cmd in forma:
        t = cmd.get("tipo","")
        if t in ("moveto","lineto"):
            xs.append(float(cmd.get("x",0))); ys.append(float(cmd.get("y",0)))
        elif t=="curveto":
            xs.extend([float(cmd.get("x1",0)),float(cmd.get("x2",0)),float(cmd.get("x",0))])
            ys.extend([float(cmd.get("y1",0)),float(cmd.get("y2",0)),float(cmd.get("y",0))])
    if not xs or not ys: return None
    x0,y0,x1,y1 = min(xs),min(ys),max(xs),max(ys)
    return {"x":x0,"y":y0,"w":max(0.0,x1-x0),"h":max(0.0,y1-y0)}


# ═══════════════════════════════════════════════════════════════════════════════
# GENERADOR PRINCIPAL — v7.8
# ═══════════════════════════════════════════════════════════════════════════════

def generar_pdf_nativo(datos, imagen_path=None, output_path="output.pdf",
                       preview=False, embed_imagen=True):
    doc   = datos["documento"]
    ancho = int(doc["ancho"]); alto = int(doc["alto"])

    capas         = _migrar_capas(datos.get("capas",[]))
    spot_channels = datos.get("spotChannels") or _default_spot_channels(capas)

    por_canal = {ch["id"]: [] for ch in spot_channels}
    for capa in capas:
        if not capa.get("visible",True): continue
        for sp in (capa.get("spots") or []):
            cid = sp.get("channelId","")
            if cid in por_canal:
                por_canal[cid].append((capa, sp))

    canales_activos = [ch for ch in spot_channels if por_canal.get(ch["id"])]
    if not canales_activos:
        raise RuntimeError("No hay capas con spot asignado para generar el PDF.")

    svg_cache = {}

    N = len(canales_activos)
    OBJ_CATALOG=1; OBJ_PAGES=2; OBJ_PAGE=3; OBJ_GSOP=4
    tint_ids    = {ch["id"]: 5+i for i,ch in enumerate(canales_activos)}
    OBJ_CONTENT = 5+N
    OBJ_IMAGE   = 5+N+1

    jpeg_bytes=None; img_w=img_h=0
    if embed_imagen and imagen_path and HAS_PILLOW:
        jpeg_bytes, img_w, img_h = _preparar_jpeg(imagen_path)

    cs = bytearray()
    cs += f"q\n1 1 1 rg\n0 0 {ancho} {alto} re\nf\nQ\n\n".encode()
    if jpeg_bytes:
        cs += f"q\n{ancho} 0 0 {alto} 0 0 cm\n/Im0 Do\nQ\n\n".encode()

    for ch in canales_activos:
        cid  = ch["id"]
        key  = _cs_key(ch)
        ink  = max(0.0, min(1.0, ch.get("inkAmount",100)/100.0))
        prev = _hex_rgb(ch.get("color","#a0a0ab")) if preview else None

        for capa, sp in por_canal[cid]:
            tid = sp.get("texturaId")
            ts  = int(sp.get("tileSize",80))
            tg  = int(sp.get("tileGap", 0))

            shapes = None
            if tid:
                ck = (tid, ts)
                if ck not in svg_cache:
                    svg_cache[ck] = _load_svg_shapes(tid, ts)
                shapes = svg_cache[ck]
                if shapes is None:
                    print(f"  [AVISO] SVG no encontrado para '{tid}' — relleno sólido")

            for zona in capa.get("zonas",[]):
                fb = _forma_bytes(zona.get("forma",[]))
                if not fb.strip(): continue

                if shapes:
                    bbox_user  = zona.get("bbox")
                    bbox_forma = _bbox_from_forma(zona.get("forma",[]))

                    if bbox_forma is None:
                        bbox = bbox_user or {"x":0,"y":0,"w":ancho,"h":alto}
                    else:
                        if bbox_user:
                            x0=min(bbox_user.get("x",0), bbox_forma["x"])
                            y0=min(bbox_user.get("y",0), bbox_forma["y"])
                            x1=max(bbox_user.get("x",0)+bbox_user.get("w",0), bbox_forma["x"]+bbox_forma["w"])
                            y1=max(bbox_user.get("y",0)+bbox_user.get("h",0), bbox_forma["y"]+bbox_forma["h"])
                            bbox={"x":x0,"y":y0,"w":x1-x0,"h":y1-y0}
                        else:
                            bbox = bbox_forma

                    margin = max(ts, abs(tg), 1)
                    bbox = {
                        "x": max(0, bbox.get("x",0)-margin),
                        "y": max(0, bbox.get("y",0)-margin),
                        "w": bbox.get("w",0)+2*margin,
                        "h": bbox.get("h",0)+2*margin,
                    }
                    cs += _emit_tiled_zone(
                        fb, bbox, shapes, ts, tg, ink, key, prev,
                        gsop=(not preview),
                        doc_alto=float(alto),   # ← v7.8: necesario para alinear grid
                    )
                else:
                    cs += b"q\n"
                    if not preview: cs += b"/GSOP gs\n"
                    cs += f"/{key} cs\n".encode()
                    if preview:
                        r,g,b=_hex_rgb(ch.get("color","#a0a0ab"))
                        cs += f"{r:.4f} {g:.4f} {b:.4f} scn\n".encode()
                    else:
                        cs += f"{ink:.4f} scn\n".encode()
                    cs += fb
                    cs += b"f\nQ\n\n"

    content_bytes = bytes(cs)

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
        k=_cs_key(ch); name=_separation_name(ch); tid=tint_ids[ch["id"]]
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

    with open(output_path,"wb") as f: f.write(buf)

    area_total = ancho*alto or 1
    print(f"  [PDF v7.8] {len(canales_activos)} spot(s), {os.path.getsize(output_path)//1024} KB")
    for ch in canales_activos:
        lista = por_canal[ch["id"]]
        pct   = 100*sum(c.get("area_px",0) for c,_ in lista)/area_total
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
        description="XPRIN-Picasso v7.8 — JSON → PDF imagen + spots UV + texturas")
    parser.add_argument("json")
    parser.add_argument("--imagen",    "-i")
    parser.add_argument("--output",    "-o")
    parser.add_argument("--preview",         action="store_true")
    parser.add_argument("--sin-imagen",      action="store_true")
    args = parser.parse_args()

    print(f"\n{'='*60}\n  XPRIN-Picasso — JSON → PDF  (v7.8)\n{'='*60}")
    with open(args.json,"r",encoding="utf-8") as f:
        datos = json.load(f)

    embed_img   = not args.sin_imagen
    imagen_path = args.imagen
    if not imagen_path and embed_img:
        json_dir = os.path.dirname(os.path.abspath(args.json))
        for ext in (".png",".jpg",".jpeg",".webp"):
            cand = os.path.join(json_dir, datos.get("id","imagen")+ext)
            if os.path.isfile(cand): imagen_path=cand; break

    pdf_path = args.output or os.path.splitext(args.json)[0]+"_spots.pdf"
    try:
        generar_pdf(datos, imagen_path, pdf_path,
                    preview=args.preview, embed_imagen=embed_img)
        print(f"\n[OK] {pdf_path}")
    except Exception:
        import traceback; traceback.print_exc(); sys.exit(1)

if __name__=="__main__":
    main()
