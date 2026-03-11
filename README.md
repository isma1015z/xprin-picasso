# XPRIN-Picasso

Editor web de impresión UV especial. Permite cargar una imagen, detectar automáticamente sus zonas de color, asignarlas a canales spot UV (W1, W2, TEXTURE) y exportar un PDF con separaciones de color listo para el sistema RIP de la impresora.

---

## Setup local

### Requisitos previos

- Python 3.12
- Node.js 18+

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
