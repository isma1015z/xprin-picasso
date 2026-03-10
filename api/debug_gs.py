"""
debug_gs.py v2 — Lee el proyecto real guardado en exports/ y ejecuta GS con output completo.
Ejecutar DESPUÉS de intentar exportar desde el editor (aunque falle):
    python debug_gs.py
"""
import subprocess, os, sys, json, glob

GS       = r"C:\Program Files\gs\gs10.06.0\bin\gswin64c.EXE"
API_DIR  = os.path.dirname(__file__)
EXPORTS  = os.path.join(API_DIR, "img", "exports")

def run_gs_verbose(ps_path: str, label: str) -> tuple[int, str]:
    pdf_path = ps_path.replace(".ps", "_dbg.pdf")
    cmd = [
        GS, "-dBATCH", "-dNOPAUSE",
        "-sDEVICE=pdfwrite", "-dPDFSETTINGS=/prepress",
        "-dPreserveSpotColors=true", "-dOverprintPreview=true",
        f"-sOutputFile={pdf_path}", ps_path,
    ]
    print(f"\n  CMD: {' '.join(cmd)}\n")
    # Importante: no usar capture_output — dejar que GS escriba directo a consola
    # y también capturar para el log
    r = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.STDOUT,
                       text=True, encoding="utf-8", errors="replace")
    out = r.stdout or ""
    return r.returncode, out


def find_latest_proyecto_json():
    """Busca el último *_proyecto.json guardado por el backend al exportar."""
    pattern = os.path.join(EXPORTS, "*_proyecto.json")
    files = sorted(glob.glob(pattern), key=os.path.getmtime, reverse=True)
    if files:
        return files[0]
    return None


def find_latest_ps():
    """Busca el último *_tmp.ps guardado por el backend."""
    pattern = os.path.join(EXPORTS, "*_tmp.ps")
    files = sorted(glob.glob(pattern), key=os.path.getmtime, reverse=True)
    if files:
        return files[0]
    return None


print("=" * 70)
print("  XPRIN-Picasso — Debug GS v2 (análisis proyecto real)")
print(f"  GS: {GS}")
print("=" * 70)

if not os.path.isfile(GS):
    print(f"\n[ERROR] GS no encontrado en: {GS}")
    sys.exit(1)

# ── Paso 1: buscar PS guardado ────────────────────────────────────────────────
ps_path = find_latest_ps()

if ps_path:
    print(f"\n  PS encontrado: {ps_path}")
    print(f"  Tamaño: {os.path.getsize(ps_path)//1024} KB")
    
    # Mostrar las primeras 80 líneas del PS
    print("\n  --- Primeras 80 líneas del PS ---")
    with open(ps_path, encoding="ascii", errors="replace") as f:
        lines = f.readlines()
    for i, line in enumerate(lines[:80], 1):
        print(f"  {i:4d}  {line}", end="")
    if len(lines) > 80:
        print(f"\n  ... ({len(lines)-80} líneas más)")
    
    print("\n\n  --- Ejecutando GS ---")
    code, out = run_gs_verbose(ps_path, "real_ps")
    
    status = "OK ✓" if code == 0 else f"FAIL ✗ (code {code})"
    print(f"\n  [{status}]  PS real del proyecto")
    print(f"\n  Output GS completo:\n  {'─'*50}")
    for line in out.split("\n"):
        print(f"  {line}")
    
    if code != 0:
        # Intentar bisección: cortar el PS a la mitad para localizar el error
        print("\n\n  --- Bisección para localizar la línea que falla ---")
        mid = len(lines) // 2
        
        # Probar primera mitad (reemplazar el contenido de spots por showpage)
        ps_half1 = "".join(lines[:mid]) + "\nshowpage\n%%EOF\n"
        ps_half2_path = ps_path.replace("_tmp.ps", "_half1.ps")
        with open(ps_half2_path, "w", encoding="ascii", errors="replace") as f:
            f.write(ps_half1)
        code1, out1 = run_gs_verbose(ps_half2_path, "half1")
        print(f"  Líneas 1-{mid}: {'OK' if code1==0 else 'FALLA'}")
        
        # Probar segunda mitad
        ps_half2 = "%!PS-Adobe-3.0\n%%BoundingBox: 0 0 500 500\n%%EndComments\n"
        ps_half2 += "<< /PageSize [500 500] >> setpagedevice\n"
        ps_half2 += "".join(lines[mid:])
        ps_half2_path = ps_path.replace("_tmp.ps", "_half2.ps")
        with open(ps_half2_path, "w", encoding="ascii", errors="replace") as f:
            f.write(ps_half2)
        code2, out2 = run_gs_verbose(ps_half2_path, "half2")
        print(f"  Líneas {mid}-{len(lines)}: {'OK' if code2==0 else 'FALLA'}")
        
        if code1 != 0:
            print(f"\n  El error está en la PRIMERA mitad (líneas 1-{mid})")
        elif code2 != 0:
            print(f"\n  El error está en la SEGUNDA mitad (líneas {mid}-{len(lines)})")
        else:
            print("\n  Curioso: ambas mitades pasan por separado. El error es de contexto acumulado.")

else:
    print("\n  No se encontró ningún *_tmp.ps en exports/")
    print("  → Necesitas intentar exportar desde el editor primero (aunque falle)")
    print(f"  → El backend guardará el PS en: {EXPORTS}\\<id>_tmp.ps")

# ── Paso 2: buscar JSON del proyecto y generar PS directamente ─────────────────
proj_json = find_latest_proyecto_json()
if proj_json:
    print(f"\n\n  JSON del proyecto encontrado: {proj_json}")
    with open(proj_json, encoding="utf-8") as f:
        datos = json.load(f)
    
    capas  = datos.get("capas", [])
    spots  = [c for c in capas if c.get("spot")]
    print(f"  Capas totales: {len(capas)}  |  Con spot: {len(spots)}")
    
    # Mostrar nombres de capas y sus zonas
    print("\n  Capas con spot:")
    for c in spots:
        n_zonas = len(c.get("zonas", []))
        n_puntos = sum(len(z.get("forma", [])) for z in c.get("zonas", []))
        nombre = c.get("nombre", "?")
        # Detectar caracteres no ASCII en nombres
        has_nonascii = any(ord(ch) > 127 for ch in nombre)
        print(f"    {c.get('spot'):<10}  {n_zonas:>3} zonas  {n_puntos:>5} puntos  nombre={repr(nombre)} {'⚠ NON-ASCII' if has_nonascii else ''}")
    
    # Generar PS manualmente para inspeccionarlo
    sys.path.insert(0, API_DIR)
    try:
        from json_to_pdf import generar_postscript
        ps = generar_postscript(datos, imagen_path=None, preview=False, embed_imagen=False)
        ps_manual = os.path.join(EXPORTS, "debug_manual.ps")
        with open(ps_manual, "w", encoding="ascii", errors="replace") as f:
            f.write(ps)
        print(f"\n  PS generado manualmente: {ps_manual} ({len(ps)//1024}KB)")
        
        # Ejecutar GS sobre él
        code, out = run_gs_verbose(ps_manual, "manual")
        status = "OK ✓" if code == 0 else f"FAIL ✗ (code {code})"
        print(f"\n  [{status}]  PS generado desde JSON guardado")
        print(f"\n  Output GS:\n  {'─'*50}")
        for line in out.split("\n"):
            print(f"  {line}")
            
    except Exception as e:
        print(f"\n  [ERROR] al generar PS desde JSON: {e}")
        import traceback; traceback.print_exc()
else:
    print("\n  No se encontró ningún *_proyecto.json en exports/")
    print("  → El backend v0.8.1 lo guarda automáticamente al intentar exportar")
