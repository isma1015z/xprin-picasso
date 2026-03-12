from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.requests import Request
from dotenv import load_dotenv
import os, uuid, json, traceback

load_dotenv()

app = FastAPI(title="XPRIN-Picasso API", version="0.9.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    traceback.print_exc()
    return JSONResponse(status_code=500, content={"detail": f"unhandled: {exc}"})

IMG_DIR    = os.path.join(os.path.dirname(__file__), "img", "uploads")
EXPORT_DIR = os.path.join(os.path.dirname(__file__), "img", "exports")
os.makedirs(IMG_DIR,    exist_ok=True)
os.makedirs(EXPORT_DIR, exist_ok=True)


def quitar_fondo(imagen_bytes: bytes) -> bytes:
    try:
        from rembg import remove
        return remove(imagen_bytes)
    except BaseException as e:
        print(f"  [AVISO] rembg fallo ({e}), imagen original")
        return imagen_bytes


def capa_tiene_spots(capa: dict) -> bool:
    """Comprueba si una capa tiene spots asignados — compatible con formato nuevo (spots[]) y viejo (spot)."""
    # Formato nuevo: spots es una lista no vacía
    spots_nuevo = capa.get("spots")
    if isinstance(spots_nuevo, list) and len(spots_nuevo) > 0:
        return True
    # Formato viejo: spot es un string no nulo
    spot_viejo = capa.get("spot")
    if spot_viejo is not None and spot_viejo != "":
        return True
    return False


@app.get("/health")
def health():
    return {"status": "ok", "version": "0.9.0"}


@app.get("/uploads/{filename}")
def get_uploaded_image(filename: str):
    safe_name = os.path.basename(filename)
    file_path = os.path.join(IMG_DIR, safe_name)
    if not os.path.isfile(file_path):
        raise HTTPException(status_code=404, detail="Imagen no encontrada")
    return FileResponse(path=file_path, media_type="image/png")


# ── POST /detect-color-zones ──────────────────────────────────────────────────
@app.post("/detect-color-zones")
async def detect_color_zones(
    imagen:      UploadFile = File(...),
    remove_bg:   bool  = Form(True),
    n_colores:   int   = Form(0),
    min_area:    int   = Form(400),
    gauss_sigma: float = Form(1.5),
    delta_e:     float = Form(12.0),
):
    from color_zone_detector import detectar_desde_bytes

    contenido = await imagen.read()
    if not contenido:
        raise HTTPException(status_code=400, detail="Imagen vacía")
    try:
        if remove_bg:
            print("  Eliminando fondo con rembg...")
            contenido = quitar_fondo(contenido)

        proyecto_id = f"proj_{str(uuid.uuid4())[:8]}"
        imagen_save = os.path.join(IMG_DIR, f"{proyecto_id}.png")

        resultado = detectar_desde_bytes(
            imagen_bytes     = contenido,
            nombre           = os.path.splitext(imagen.filename or "imagen")[0],
            n_colores        = n_colores,
            min_area         = min_area,
            gauss_sigma      = gauss_sigma,
            delta_e_umbral   = delta_e,
            imagen_save_path = imagen_save,
        )

        resultado["id"] = proyecto_id
        resultado["imagen_url"] = f"/uploads/{proyecto_id}.png"

        with open(os.path.join(IMG_DIR, f"{proyecto_id}.json"), "w") as f:
            json.dump({"imagen_path": imagen_save}, f)

        return {k: v for k, v in resultado.items() if not k.startswith("_")}

    except HTTPException:
        raise
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"detect-color-zones: {e}")


# ── POST /export-pdf ──────────────────────────────────────────────────────────
@app.post("/export-pdf")
async def export_pdf(
    proyecto:     str = Form(...),
    preview:      bool = Form(False),
    embed_imagen: bool = Form(True),
    imagen:       UploadFile = File(None),
):
    from json_to_pdf import generar_pdf

    proyecto_dict = json.loads(proyecto)
    proyecto_id   = proyecto_dict.get("id", "")
    nombre        = proyecto_dict.get("nombre", "proyecto")

    imagen_path = None
    temp_imagen = None

    # 1. Si viene imagen en el request, usarla (prioridad alta)
    if imagen:
        print(f"  [EXPORT] Usando imagen subida en el request para {proyecto_id}")
        contenido = await imagen.read()
        if contenido:
            temp_imagen = os.path.join(IMG_DIR, f"temp_{proyecto_id}_{uuid.uuid4().hex[:6]}.png")
            with open(temp_imagen, "wb") as f:
                f.write(contenido)
            imagen_path = temp_imagen

    # 2. Si no viene, buscarla en disco
    if not imagen_path:
        sidecar = os.path.join(IMG_DIR, f"{proyecto_id}.json")
        if os.path.isfile(sidecar):
            with open(sidecar) as f:
                imagen_path = json.load(f).get("imagen_path")

        if not imagen_path or not os.path.isfile(imagen_path):
            for ext in (".png", ".jpg", ".jpeg", ".webp"):
                c = os.path.join(IMG_DIR, f"{proyecto_id}{ext}")
                if os.path.isfile(c):
                    imagen_path = c; break

    if embed_imagen and (not imagen_path or not os.path.isfile(imagen_path)):
        raise HTTPException(status_code=404,
            detail=f"Imagen no encontrada para {proyecto_id}. Súbela de nuevo.")

    # ── Validar que hay al menos una capa con spots (formato nuevo O viejo) ──
    capas_con_spots = [c for c in proyecto_dict.get("capas", []) if capa_tiene_spots(c)]
    if not capas_con_spots:
        raise HTTPException(status_code=400, detail="No hay capas con spot asignado.")

    sufijo   = "_preview.pdf" if preview else "_spots.pdf"
    pdf_path = os.path.join(EXPORT_DIR, f"{proyecto_id}{sufijo}")

    # Guardar JSON completo para debug/CLI
    json_debug = os.path.join(EXPORT_DIR, f"{proyecto_id}_proyecto.json")
    with open(json_debug, "w", encoding="utf-8") as f:
        json.dump(proyecto_dict, f, ensure_ascii=False, indent=2)

    try:
        generar_pdf(
            proyecto_dict, imagen_path, pdf_path,
            preview=preview, conservar_ps=False, embed_imagen=embed_imagen,
        )
    except RuntimeError as e:
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error generando PDF: {e}")
    finally:
        if temp_imagen and os.path.isfile(temp_imagen):
            try: os.remove(temp_imagen)
            except: pass

    if not os.path.isfile(pdf_path):
        raise HTTPException(status_code=500, detail="PDF no generado.")

    return FileResponse(
        path       = pdf_path,
        filename   = f"{nombre}{'_preview' if preview else '_spots'}.pdf",
        media_type = "application/pdf",
    )
