"""
json_to_pdf.py  —  XPRIN-Picasso  (v3.1 — PS estandar, sin operadores PDF)
---------------------------------------------------------------------------
FIXES v3.1:
  - cs  → setcolorspace  (cs es operador PDF, falla en modo PS puro de GS)
  - [1] sc → opacidad setcolor  (setcolor espera valores en el stack, no array)
  - Eliminados op/OP que se anulaban entre si (true setoverprint + false setoverprint)
  - Overprint ON una vez antes de cada bloque spot, dentro del gsave
  - Operadores abreviados solo m/l/c/h/f/q/Q (seguros en PS)

Canales spot (UV):
    w1      → W1        (white base)
    w2      → W2        (white relieve)
    texture → TEXTURE

Orden PDF:
    1. Fondo blanco
    2. W1  (CIEBasedABC + overprint)
    3. W2  (CIEBasedABC + overprint)
    4. TEXTURE (CIEBasedABC + overprint)
    5. Imagen base encima

Uso CLI:
    python json_to_pdf.py capas.json
    python json_to_pdf.py capas.json --imagen foto.png
    python json_to_pdf.py capas.json --output resultado.pdf
    python json_to_pdf.py capas.json --preview      # spots como RGB
    python json_to_pdf.py capas.json --solo-ps
    python json_to_pdf.py capas.json --debug        # conserva el .ps
"""

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

# Coeficientes CIEBasedABC para cada canal UV.
# (a1, a2, b1, b2, c1, c2): curva Lab de la tinta.
SPOT_CHANNELS = {
    "w1": {
        "nombre":      "W1",
        "coefs":       (-46.667, 100.0, 69.0, 0.0, 44.0, 0.0),
        "preview_rgb": (1.0, 1.0, 1.0),
    },
    "w2": {
        "nombre":      "W2",
        "coefs":       (-46.667, 100.0, 69.0, 0.0, 44.0, 0.0),
        "preview_rgb": (0.90, 0.90, 0.95),
    },
    "texture": {
        "nombre":      "TEXTURE",
        "coefs":       (-30.0, 95.0, 50.0, 0.0, 35.0, 0.0),
        "preview_rgb": (0.80, 0.88, 1.0),
    },
}

MAX_IMG_PX = 800


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
    """Conversion hex → CMYK con casos especiales para colores tipicos de logos."""
    if color:
        c = color.strip().lower()
        if c in ("#fff", "#ffffff"):               return (0.0, 0.0, 0.0, 0.0)
        if c in ("#000", "#000000"):               return (0.0, 0.0, 0.0, 1.0)
        if c in ("#00529f", "#003d7c", "#00468b"): return (1.0, 0.49, 0.0, 0.38)
        if c in ("#ee324e", "#d00020", "#cc0022"): return (0.0, 0.79, 0.67, 0.07)
        if c in ("#febe10", "#ffcc00", "#f5c518"): return (0.0, 0.25, 0.94, 0.0)
        if c in ("#6f1f3a", "#7b1f3e", "#8b1f42"): return (0.0, 0.72, 0.47, 0.57)
        if c in ("#0d2240", "#0a1f3c", "#0e2244"): return (0.96, 0.71, 0.0, 0.75)
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
# BLOQUE CIEBasedABC (PostScript estandar — sin cs/sc)
# ═══════════════════════════════════════════════════════════════════════════════

def _spot_block_ps(spot_key: str, opacidad: float) -> str:
    """
    Genera el bloque PS para un canal spot UV usando CIEBasedABC.
    Usa SOLO operadores PostScript estandar:
      - setcolorspace  (no 'cs' que es PDF)
      - setoverprint   (no 'op'/'OP' que son alias que se anulaban)
      - setcolor       (no '[1] sc' — setcolor recibe valores en el stack)
    """
    ch = SPOT_CHANNELS[spot_key]
    a1, a2, b1, b2, c1, c2 = ch["coefs"]
    opa = max(0.0, min(1.0, float(opacidad)))

    return (
        # --- setcolorspace: define el espacio de color del canal spot ---
        f"[/Separation ({ch['nombre']}) [/CIEBasedABC <<\n"
        f"  /RangeABC [0 100 -128 127 -128 127]\n"
        f"  /DecodeABC [{{16 add 116 div}} bind {{500 div}} bind {{200 div}} bind]\n"
        f"  /MatrixABC [1 1 1 1 0 0 0 0 -1]\n"
        f"  /DecodeLMN\n"
        f"    [{{dup 6 29 div ge {{dup dup mul mul}}\n"
        f"       {{4 29 div sub 108 841 div mul}} ifelse 0.9637 mul}} bind\n"
        f"     {{dup 6 29 div ge {{dup dup mul mul}}\n"
        f"       {{4 29 div sub 108 841 div mul}} ifelse 1.0000 mul}} bind\n"
        f"     {{dup 6 29 div ge {{dup dup mul mul}}\n"
        f"       {{4 29 div sub 108 841 div mul}} ifelse 0.8241 mul}} bind]\n"
        f"  /WhitePoint [0.9637 1.0000 0.8241]\n"
        f"  /BlackPoint [0 0 0]\n"
        f">>]\n"
        # tint transform: convierte tint [0..1] a Lab via las curvas del canal
        f"{{  dup 0 lt {{ pop 0 }} {{ dup 1 gt {{ pop 1 }} if }} ifelse\n"
        f"  0 index {opa:.4f} exp {a1:.4f} mul {a2:.4f} add\n"
        f"  1 index {opa:.4f} exp {b1:.4f} mul {b2:.4f} add\n"
        f"  2 index {opa:.4f} exp {c1:.4f} mul {c2:.4f} add\n"
        f"  4 3 roll pop\n"
        f"}}] setcolorspace\n"           # <-- setcolorspace, NO cs
        f"true setoverprint\n"           # <-- overprint ON para este canal
        f"{opa:.4f} setcolor"            # <-- setcolor con valor en stack, NO [1] sc
    )


def _spot_block_preview(spot_key: str) -> str:
    """Modo preview: sustituye el spot por un color RGB visible."""
    r, g, b = SPOT_CHANNELS[spot_key]["preview_rgb"]
    return f"{r:.4f} {g:.4f} {b:.4f} setrgbcolor"


# ═══════════════════════════════════════════════════════════════════════════════
# PATHS
# ═══════════════════════════════════════════════════════════════════════════════

def _forma_a_ps(forma: list) -> str:
    """
    Convierte lista de comandos forma a PostScript.
    Soporta moveto, lineto, curveto, closepath.
    Las coordenadas Y ya vienen en espacio PS (flip Y aplicado por el detector).
    """
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
# IMAGEN BASE
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
        ratio = min(MAX_IMG_PX/w, MAX_IMG_PX/h)
        img = img.resize((int(w*ratio), int(h*ratio)), Image.LANCZOS)

    iw, ih = img.size
    hex_data  = img.tobytes().hex().upper()
    hex_lines = [hex_data[i:i+76] for i in range(0, len(hex_data), 76)]

    return [
        "% =========================================================",
        "% Imagen base (encima de spots)",
        "% =========================================================",
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
        "    /DataSource currentfile /ASCIIHexDecode filter",
        "  >>",
        "  image",
    ] + hex_lines + [">", "Q", ""]


def _textura_disp_ps_bloque(disp_path: str, ancho_doc: int, alto_doc: int, spot_key: str, opacidad: float, preview: bool) -> list[str]:
    """Crea un bloque de imagen a escala del documento usando la imagen DISP en el espacio de color spot (o RGB si es preview)."""
    if not HAS_PILLOW or not os.path.isfile(disp_path):
        return [f"% [AVISO] Pillow no instalado o archivo {disp_path} no encontrado", ""]

    try:
        img = Image.open(disp_path).convert("L")
    except Exception as e:
        return [f"% [AVISO] Error abriendo textura DISP: {e}", ""]

    # Queremos que la textura se repita (tiling) cada 400 puntos (como en Frontend) o escalada.
    # Para coincidir con SVG <pattern width="400" height="400">, tileamos cada 400px.
    # Para no generar un PS enorme, limitamos la imagen de salida a un tamano razonable (MAX_IMG_PX).
    out_w = min(ancho_doc, int(MAX_IMG_PX * 1.5))
    out_h = min(alto_doc, int(MAX_IMG_PX * 1.5))

    fondo = Image.new("L", (out_w, out_h), color=0)
    # Escalar el tile source a la proporcion de 400 del frontend.
    # El Frontend hace pattern de 400x400 CSS. Si ancho_doc se dibuja a 1:1, el tile es 400px.
    # Redimensionamos el tile source para que supla esa proporcion si document es mayor.
    tile_w = int((400 * out_w) / ancho_doc) if ancho_doc else 400
    tile_h = int((400 * out_h) / alto_doc) if alto_doc else 400
    if tile_w < 1: tile_w = 400
    if tile_h < 1: tile_h = 400

    img = img.resize((tile_w, tile_h), Image.LANCZOS)
    for y in range(0, out_h, tile_h):
        for x in range(0, out_w, tile_w):
            fondo.paste(img, (x, y))

    # Convertir a hexa
    iw, ih = fondo.size
    hex_data  = fondo.tobytes().hex().upper()
    hex_lines = [hex_data[i:i+76] for i in range(0, len(hex_data), 76)]

    if preview:
        r, g, b = SPOT_CHANNELS[spot_key]["preview_rgb"]
        header = [
            f"  {r:.4f} {g:.4f} {b:.4f} setrgbcolor",
            # En preview no pintamos la imagen real pixel-a-pixel al tint, pintamos un gris simulado?
            # Para preview dibujamos como DeviceGray pero usando Multiply o simplemente solido.
            # Por simplicidad en preview coloreado, no vamos a simular el patron de la textura compleja. 
            # Pero podemos usar la textura DISP como DeviceGray.
            f"  {ancho_doc} {alto_doc} scale",
            "  /DeviceGray setcolorspace",
            "  <<\n    /ImageType 1",
            f"    /Width {iw}\n    /Height {ih}\n    /BitsPerComponent 8",
            "    /Decode [0 1]", # Invertimos decode si es necesario, asumimos 0=negro
            f"    /ImageMatrix [{iw} 0 0 {-ih} 0 {ih}]",
            "    /DataSource currentfile /ASCIIHexDecode filter\n  >>",
            "  image"
        ]
    else:
        # Modo impresion: aplicamos color spot
        # Usamos _spot_block_ps OMITIENDO el setcolor (la imagen define los tint)
        ch_nombre = SPOT_CHANNELS[spot_key]["nombre"]
        a1, a2, b1, b2, c1, c2 = SPOT_CHANNELS[spot_key]["coefs"]
        
        sep_code = (
            f"[/Separation ({ch_nombre}) [/CIEBasedABC <<\n"
            f"  /RangeABC [0 100 -128 127 -128 127]\n"
            f"  /DecodeABC [{{16 add 116 div}} bind {{500 div}} bind {{200 div}} bind]\n"
            f"  /MatrixABC [1 1 1 1 0 0 0 0 -1]\n"
            f"  /DecodeLMN\n"
            f"    [{{dup 6 29 div ge {{dup dup mul mul}}\n"
            f"       {{4 29 div sub 108 841 div mul}} ifelse 0.9637 mul}} bind\n"
            f"     {{dup 6 29 div ge {{dup dup mul mul}}\n"
            f"       {{4 29 div sub 108 841 div mul}} ifelse 1.0000 mul}} bind\n"
            f"     {{dup 6 29 div ge {{dup dup mul mul}}\n"
            f"       {{4 29 div sub 108 841 div mul}} ifelse 0.8241 mul}} bind]\n"
            f"  /WhitePoint [0.9637 1.0000 0.8241]\n"
            f"  /BlackPoint [0 0 0]\n"
            f">>]\n"
            f"{{  dup 0 lt {{ pop 0 }} {{ dup 1 gt {{ pop 1 }} if }} ifelse\n"
            f"  0 index {opacidad:.4f} exp {a1:.4f} mul {a2:.4f} add\n"
            f"  1 index {opacidad:.4f} exp {b1:.4f} mul {b2:.4f} add\n"
            f"  2 index {opacidad:.4f} exp {c1:.4f} mul {c2:.4f} add\n"
            f"  4 3 roll pop\n"
            f"}}] setcolorspace\n"
            f"true setoverprint"
        )
        
        header = [
            f"  {sep_code}",
            f"  {ancho_doc} {alto_doc} scale",
            "  <<\n    /ImageType 1",
            f"    /Width {iw}\n    /Height {ih}\n    /BitsPerComponent 8",
            "    /Decode [0 1]", 
            f"    /ImageMatrix [{iw} 0 0 {-ih} 0 {ih}]",
            "    /DataSource currentfile /ASCIIHexDecode filter\n  >>",
            "  image"
        ]

    return header + hex_lines + [">"]


# ═══════════════════════════════════════════════════════════════════════════════
# GENERADOR PS PRINCIPAL
# ═══════════════════════════════════════════════════════════════════════════════

def generar_postscript(datos: dict, imagen_path: str | None = None,
                       preview: bool = False) -> str:
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

    area_total = ancho * alto
    cobertura = {
        s: round(100 * sum(c["area_px"] for c in lst) / area_total, 2)
        for s, lst in por_spot.items()
    } if area_total else {s: 0.0 for s in SPOTS_ORDEN}

    ts   = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    modo = "PREVIEW" if preview else "PREIMPRESION"

    lines = [
        "%!PS-Adobe-3.0",
        f"%%Title: XPRIN-Picasso — {nombre}",
        f"%%Creator: json_to_pdf.py v3.1 ({modo})",
        f"%%CreationDate: {ts}",
        f"%%BoundingBox: 0 0 {ancho} {alto}",
        "%%DocumentColorSpaces: (W1) (W2) (TEXTURE)",
        "%%EndComments",
        "",
        "% Operadores abreviados (PostScript estandar)",
        "/m { moveto }    bind def",
        "/l { lineto }    bind def",
        "/c { curveto }   bind def",
        "/h { closepath } bind def",
        "/f { fill }      bind def",
        "/q { gsave }     bind def",
        "/Q { grestore }  bind def",
        "",
        f"<< /PageSize [{ancho} {alto}] >> setpagedevice",
        "",
        "% Cobertura de canales spot:",
    ]
    for spot in SPOTS_ORDEN:
        lines.append(
            f"%   {SPOT_NOMBRE_PDF[spot]}: {cobertura[spot]}%  "
            f"({len(por_spot[spot])} capas)"
        )

    lines += [
        "",
        "% =========================================================",
        "% Capa 0: fondo blanco",
        "% =========================================================",
        "q",
        "  1 1 1 setrgbcolor",
        f"  0 0 {ancho} {alto} rectfill",
        "Q",
        "",
    ]

    # ── Capas CMYK ────────────────────────────────────────────────────────────
    if capas_cmyk:
        lines += [
            "% =========================================================",
            f"% Capas CMYK ({len(capas_cmyk)} sin spot asignado)",
            "% =========================================================",
            "",
        ]
        for capa in capas_cmyk:
            c_id     = capa.get("id", "?")
            c_nombre = capa.get("nombre", "Capa").encode("ascii","replace").decode()
            cv, mv, yv, kv = _hex_to_cmyk(capa.get("color"))
            lines.append(f"% {c_nombre} ({c_id})  CMYK {cv:.2f} {mv:.2f} {yv:.2f} {kv:.2f}")
            for zona in capa.get("zonas", []):
                forma_ps = _forma_a_ps(zona.get("forma", []))
                if not forma_ps.strip():
                    continue
                lines += [
                    "q",
                    f"  /DeviceCMYK setcolorspace",
                    f"  {cv:.4f} {mv:.4f} {yv:.4f} {kv:.4f} setcolor",
                    "  newpath",
                    forma_ps,
                    "  f",
                    "Q",
                    "",
                ]

    # ── Canales spot ──────────────────────────────────────────────────────────
    for spot in SPOTS_ORDEN:
        lista      = por_spot[spot]
        nombre_pdf = SPOT_NOMBRE_PDF[spot]

        lines += [
            "% =========================================================",
            f"% Canal spot: {nombre_pdf}  ({len(lista)} capa(s), {cobertura[spot]}%)",
            "% =========================================================",
            "",
        ]

        if not lista:
            lines += [f"% (sin capas para {nombre_pdf})", ""]
            continue

        for capa in lista:
            c_id     = capa.get("id", "?")
            c_nombre = capa.get("nombre", "Capa").encode("ascii","replace").decode()
            opacidad = float(capa.get("opacidad", 1.0))
            lines.append(f"% Capa: {c_nombre} ({c_id})")

            for zona in capa.get("zonas", []):
                forma_ps = _forma_a_ps(zona.get("forma", []))
                if not forma_ps.strip():
                    continue

                textura_disp = capa.get("texturaDisp")
                # Si hay imagen DISP, la usamos buscando su ruta.
                disp_path = None
                if textura_disp and isinstance(textura_disp, str):
                    # textura_disp viene como "/textures/folder/file.png"
                    # Asumimos que json_to_pdf corre al lado de /frontend o /api
                    script_dir = os.path.dirname(os.path.abspath(__file__))
                    # Reconstruye "frontend/public/textures/..."
                    disp_path_cand = os.path.join(script_dir, "..", "frontend", "public", textura_disp.lstrip("/"))
                    disp_path_cand = os.path.abspath(disp_path_cand)
                    if os.path.isfile(disp_path_cand):
                        disp_path = disp_path_cand

                if preview:
                    color_block = _spot_block_preview(spot)
                    lines += [
                        "q",
                        f"  {color_block}",
                        "  newpath",
                        forma_ps,
                    ]
                    if disp_path:
                        lines += [ "  clip" ]
                        lines += _textura_disp_ps_bloque(disp_path, ancho, alto, spot, opacidad, preview=True)
                    else:
                        lines += [ "  f" ]
                    lines += [
                        "Q",
                        "",
                    ]
                else:
                    if disp_path:
                        lines += [
                            "q",
                            "  newpath",
                            forma_ps,
                            "  clip"
                        ]
                        lines += _textura_disp_ps_bloque(disp_path, ancho, alto, spot, opacidad, preview=False)
                        lines += [
                            "Q",
                            "",
                        ]
                    else:
                        sep = _spot_block_ps(spot, opacidad)
                        lines += [
                            "q",
                            f"  {sep}",
                            "  newpath",
                            forma_ps,
                            "  f",
                            "Q",
                            "",
                        ]

    # ── Imagen base ───────────────────────────────────────────────────────────
    if imagen_path:
        lines += _imagen_a_ps_bloque(imagen_path, ancho, alto)
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
        "-sDEVICE=pdfwrite", "-dPDFSETTINGS=/prepress",
        "-dPreserveSpotColors=true", "-dOverprintPreview=true",
        f"-sOutputFile={pdf_path}", ps_path,
    ]
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode != 0:
        # Capturar el error real de GS (no solo el codigo)
        stderr = (r.stderr or "").strip()
        stdout = (r.stdout or "").strip()
        # GS manda los errores a stdout en algunos modos
        detalle = stderr if stderr else stdout
        if not detalle:
            detalle = "sin detalle — usa --debug para conservar el .ps"
        raise RuntimeError(
            f"Ghostscript error (codigo {r.returncode}):\n{detalle[:2000]}"
        )


def generar_pdf(
    datos: dict,
    imagen_path: str | None,
    output_path: str,
    gs_bin: str | None = None,
    preview: bool = False,
    conservar_ps: bool = False,
) -> str:
    ps_path = output_path.replace(".pdf", "_tmp.ps")
    ps_content = generar_postscript(datos, imagen_path, preview=preview)

    with open(ps_path, "w", encoding="ascii", errors="replace") as f:
        f.write(ps_content)

    gs = gs_bin or buscar_ghostscript()
    if not gs:
        raise RuntimeError(
            "Ghostscript no encontrado. "
            "Instalalo desde https://www.ghostscript.com/releases/gsdnld.html"
        )

    try:
        ps_a_pdf(ps_path, output_path, gs)
    except Exception:
        # En caso de error siempre conservar el .ps para diagnosis
        print(f"  [DEBUG] PS conservado en: {ps_path}")
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
        description="XPRIN-Picasso — JSON capas → PDF con separacion CIEBasedABC"
    )
    parser.add_argument("json")
    parser.add_argument("--imagen",  "-i", help="Ruta a la imagen base")
    parser.add_argument("--output",  "-o", help="Ruta del PDF de salida")
    parser.add_argument("--gs",           help="Ruta al ejecutable Ghostscript")
    parser.add_argument("--preview",      action="store_true",
                        help="Modo preview: spots como RGB visible")
    parser.add_argument("--debug",        action="store_true",
                        help="Conserva el .ps tras convertir")
    parser.add_argument("--solo-ps",      action="store_true",
                        help="Solo genera el .ps, sin convertir")
    args = parser.parse_args()

    print(f"\n{'='*60}")
    print(f"  XPRIN-Picasso — JSON → PDF  (v3.1 PS estandar)")
    print(f"{'='*60}")

    with open(args.json, "r", encoding="utf-8") as f:
        datos = json.load(f)

    nombre  = datos.get("nombre", "proyecto")
    n_capas = len(datos.get("capas", []))
    c_spot  = [c for c in datos.get("capas", []) if c.get("spot")]
    print(f"\n  Proyecto : {nombre}")
    print(f"  Capas    : {n_capas}  |  con spot: {len(c_spot)}")
    print(f"  Modo     : {'PREVIEW (RGB)' if args.preview else 'PREIMPRESION (CIEBasedABC)'}")

    imagen_path = args.imagen
    if not imagen_path:
        json_dir   = os.path.dirname(os.path.abspath(args.json))
        img_ref    = datos.get("imagenBase") or {}
        img_nombre = img_ref.get("ruta","") if isinstance(img_ref, dict) else str(img_ref)
        for cand in [img_nombre, os.path.join(json_dir, img_nombre),
                     os.path.join(json_dir, os.path.basename(img_nombre))]:
            if cand and os.path.isfile(cand):
                imagen_path = cand; break

    print(f"  Imagen   : {imagen_path or '[no encontrada]'}")

    base     = os.path.splitext(args.json)[0]
    ps_path  = base + "_tmp.ps"
    pdf_path = args.output or base + "_spots.pdf"

    ps_content = generar_postscript(datos, imagen_path, preview=args.preview)
    with open(ps_path, "w", encoding="ascii", errors="replace") as f:
        f.write(ps_content)
    print(f"\n  PostScript: {ps_path}  ({len(ps_content)//1024} KB)")

    if args.solo_ps:
        print("\n[OK] --solo-ps listo.")
        return

    gs_bin = args.gs or buscar_ghostscript()
    if not gs_bin:
        print("\n[AVISO] Ghostscript no encontrado.")
        print("  https://www.ghostscript.com/releases/gsdnld.html")
        sys.exit(1)

    try:
        ps_a_pdf(ps_path, pdf_path, gs_bin)
    except RuntimeError as e:
        print(f"\n[ERROR] {e}")
        print(f"  .ps conservado para inspeccionar: {ps_path}")
        sys.exit(1)

    if not args.debug and os.path.isfile(ps_path):
        os.remove(ps_path)

    size_kb = os.path.getsize(pdf_path) / 1024
    print(f"\n[OK] PDF: {pdf_path}  ({size_kb:.1f} KB)")

    area_total = ancho * alto if (ancho := datos["documento"]["ancho"]) and (alto := datos["documento"]["alto"]) else 1
    print(f"\n  {'Canal':<10}  {'Capas':>6}  {'Cobertura':>10}")
    print(f"  {'-'*30}")
    for spot in SPOTS_ORDEN:
        lista = [c for c in datos.get("capas",[]) if c.get("spot") == spot]
        pct   = 100 * sum(c["area_px"] for c in lista) / area_total if area_total else 0
        print(f"  {SPOT_NOMBRE_PDF[spot]:<10}  {len(lista):>6}  {pct:>9.2f}%")


if __name__ == "__main__":
    main()
