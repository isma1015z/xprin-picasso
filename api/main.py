from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from dotenv import load_dotenv
import os, uuid, json

load_dotenv()

app = FastAPI(title="XPRIN-Picasso API", version="0.7.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

IMG_DIR    = os.path.join(os.path.dirname(__file__), "img", "uploads")
EXPORT_DIR = os.path.join(os.path.dirname(__file__), "img", "exports")
os.makedirs(IMG_DIR,    exist_ok=True)
os.makedirs(EXPORT_DIR, exist_ok=True)


def quitar_fondo(imagen_bytes: bytes) -> bytes:
    try:
        from rembg import remove
        return remove(imagen_bytes)
    except Exception as e:
        print(f"  [AVISO] rembg fallo ({e}), imagen original")
        return imagen_bytes


@app.get("/health")
def health():
    return {"status": "ok", "version": "0.7.0"}


# ── POST /detect-color-zones ──────────────────────────────────────────────────
@app.post("/detect-color-zones")
async def detect_color_zones(
    imagen:      UploadFile = File(...),
    remove_bg:   bool  = Form(True),
    n_colores:   int   = Form(0),       # 0 = automático
    min_area:    int   = Form(400),
    gauss_sigma: float = Form(1.5),     # suavizado gaussiano pre-cuantización
    delta_e:     float = Form(12.0),    # umbral fusión capas similares
):
    from color_zone_detector import detectar_desde_bytes

    contenido = await imagen.read()
    if not contenido:
        raise HTTPException(status_code=400, detail="Imagen vacía")

    # 1. Eliminar fondo
    if remove_bg:
        print("  Eliminando fondo con rembg...")
        contenido = quitar_fondo(contenido)

    # 2. Guardar imagen procesada (sin fondo)
    proyecto_id = f"proj_{str(uuid.uuid4())[:8]}"
    imagen_save = os.path.join(IMG_DIR, f"{proyecto_id}.png")

    try:
        # 3. Gaussian blur + K-means + contornos
        resultado = detectar_desde_bytes(
            imagen_bytes   = contenido,
            nombre         = os.path.splitext(imagen.filename or "imagen")[0],
            n_colores      = n_colores,
            min_area       = min_area,
            gauss_sigma    = gauss_sigma,
            delta_e_umbral = delta_e,
            imagen_save_path = imagen_save,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    resultado["id"] = proyecto_id

    # Sidecar con ruta de imagen
    with open(os.path.join(IMG_DIR, f"{proyecto_id}.json"), "w") as f:
        json.dump({"imagen_path": imagen_save}, f)

    return {k: v for k, v in resultado.items() if not k.startswith("_")}


# ── POST /export-pdf ──────────────────────────────────────────────────────────
@app.post("/export-pdf")
async def export_pdf(proyecto: dict, preview: bool = False):
    from json_to_pdf import generar_pdf

    proyecto_id = proyecto.get("id", "")
    nombre      = proyecto.get("nombre", "proyecto")

    # Buscar imagen guardada
    sidecar     = os.path.join(IMG_DIR, f"{proyecto_id}.json")
    imagen_path = None
    if os.path.isfile(sidecar):
        with open(sidecar) as f:
            imagen_path = json.load(f).get("imagen_path")

    if not imagen_path or not os.path.isfile(imagen_path):
        for ext in (".png", ".jpg", ".jpeg", ".webp"):
            c = os.path.join(IMG_DIR, f"{proyecto_id}{ext}")
            if os.path.isfile(c):
                imagen_path = c; break

    if not imagen_path or not os.path.isfile(imagen_path):
        raise HTTPException(status_code=404,
            detail=f"Imagen no encontrada para {proyecto_id}.")

    if not [c for c in proyecto.get("capas", []) if c.get("spot")]:
        raise HTTPException(status_code=400, detail="No hay capas con spot asignado.")

    sufijo   = "_preview.pdf" if preview else "_spots.pdf"
    pdf_path = os.path.join(EXPORT_DIR, f"{proyecto_id}{sufijo}")

    try:
        generar_pdf(proyecto, imagen_path, pdf_path, preview=preview, conservar_ps=False)
    except RuntimeError as e:
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generando PDF: {e}")

    if not os.path.isfile(pdf_path):
        raise HTTPException(status_code=500, detail="PDF no generado.")

    return FileResponse(
        path       = pdf_path,
        filename   = f"{nombre}{'_preview' if preview else '_spots'}.pdf",
        media_type = "application/pdf",
    )
