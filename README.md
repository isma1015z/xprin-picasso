# XPRIN-Picasso

Editor web de impresión UV especial. Permite cargar una imagen, detectar automáticamente sus zonas de color, asignarlas a canales spot UV (W1, W2, TEXTURE) y exportar un PDF con separaciones de color listo para el sistema RIP de la impresora.

---

## Stack tecnológico

**Frontend**
- React 19 + Vite
- Tailwind CSS v4 (sistema de temas dark/light con CSS variables)
- Zustand — estado global
- react-zoom-pan-pinch — zoom y pan del canvas
- lucide-react — iconografía

**Backend**
- FastAPI + Uvicorn
- OpenCV + NumPy — detección y vectorización de zonas de color
- rembg — eliminación de fondo con IA
- Ghostscript — conversión PostScript → PDF
- Supabase — autenticación

---

## Estructura del proyecto

```
xprin-picasso/
├── api/
│   ├── main.py                  # Endpoints FastAPI (v0.7.0)
│   ├── color_zone_detector.py   # Pipeline de detección (v8)
│   ├── json_to_pdf.py           # Generador PostScript/PDF (v3.1)
│   ├── requirements.txt
│   ├── Dockerfile
│   └── img/
│       ├── uploads/             # Imágenes procesadas + sidecars JSON
│       └── exports/             # PDFs generados
└── frontend/
    └── src/
        ├── store.js             # Estado global (Zustand)
        ├── index.css            # Variables de tema dark/light
        ├── pages/
        │   └── Editor.jsx
        └── components/
            ├── Header.jsx       # Barra superior (subir imagen, exportar PDF, tema)
            ├── Sidebar.jsx      # Panel lateral (capas, texturas, spots UV)
            ├── Canvas.jsx       # Área de edición con zoom/pan
            └── DetectionSettings.jsx  # Panel de ajustes de detección
```

---

## Pipeline de detección de color (v8)

La detección sigue cuatro pasos simples inspirados en el enfoque del editor JavaScript externo:

```
1. Gaussian blur      suaviza bordes antes de cuantizar (sigma configurable)
2. K-means            agrupa píxeles por color dominante (K automático o manual)
3. findContours       contorno exterior por cada componente conectada
4. approxPolyDP       simplificación RDP → polígono vectorial limpio
5. Fusión por ΔE      agrupa zonas de colores similares en una misma capa
```

### Parámetros configurables desde el editor

| Parámetro | Default | Descripción |
|---|---|---|
| `remove_bg` | `true` | Eliminar fondo con rembg antes de detectar |
| `gauss_sigma` | `1.5` | Suavizado gaussiano pre-cuantización |
| `n_colores` | `0` (auto) | Número de colores K-means (0 = automático) |
| `delta_e` | `12.0` | Umbral de fusión de capas similares |
| `min_area` | `400` | Área mínima de zona en px² |

### Uso desde CLI

```powershell
python color_zone_detector.py imagen.png
python color_zone_detector.py imagen.png --colores 8 --sigma 2.0
python color_zone_detector.py imagen.png --debug   # genera _debug.png con paths
```

---

## Canales spot UV

| Key interno | Nombre PDF | Color en editor |
|---|---|---|
| `w1` | `W1` | gris claro |
| `w2` | `W2` | azul |
| `texture` | `TEXTURE` | ámbar |

Las separaciones usan espacio de color **CIEBasedABC** en el PostScript generado, con coeficientes Lab específicos por canal. El modo `?preview=true` sustituye CIEBasedABC por RGB visible para verificar resultados antes de imprimir.

**Orden de renderizado en el PDF:**
1. Fondo blanco
2. Capas CMYK (sin spot)
3. W1 → W2 → TEXTURE (con `true setoverprint`)
4. Imagen base encima

---

## Flujo de uso

```
Subir imagen
  └─► POST /detect-color-zones
        · rembg elimina el fondo
        · Gaussian + K-means + findContours vectoriza zonas
        · Devuelve capas JSON con polígonos
        · Guarda imagen en img/uploads/proj_XXXXXXXX.png

Asignar spots en el Sidebar
  └─► Selector por capa: CMYK / W1 / W2 / TEXTURE

Exportar PDF
  └─► POST /export-pdf
        · Recupera imagen desde sidecar JSON
        · Genera PostScript con CIEBasedABC por canal
        · Ghostscript convierte a PDF
        · Descarga automática en el navegador
```

---

## Setup local

### Requisitos previos

- Python 3.12
- Node.js 18+
- Ghostscript instalado en `C:\Program Files\gs\gs10.x.x\bin\gswin64c.exe`

### Backend

```powershell
cd api

# Instalar dependencias
pip install -r requirements.txt

# Arrancar servidor
python -m uvicorn main:app --reload --port 8000
```

### Frontend

```powershell
cd frontend

# Instalar dependencias
npm install

# Desarrollo
npm run dev
```

El frontend corre en `http://localhost:5173` y hace proxy de `/api/*` al backend en `http://localhost:8000`.

### Texturas (opcional)

Copiar las texturas al directorio `public` del frontend:

```
frontend/public/textures/WaterDropletsMixedBubbled001/WaterDropletsMixedBubbled001_COL_2K.jpg
```

---

## Variables de entorno

Crear `api/.env`:

```env
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_ANON_KEY=eyJ...
```

---

## Equipo

| Rol | Responsable |
|---|---|
| Full Stack + Infra | Ismael |
| Frontend / Editor | Andrea, Alejandro |
| Canvas (Fabric.js) | Juan |
| Pipeline PS/PDF | Alvaro |
| Landing | Nacho |
| Registro | Carlos |
| Login | Jorge |
| Assets SVG | Blanca |
