// Canvas — react-zoom-pan-pinch + overlays SVG con texturas
// Responsable: Juan

import { useRef } from 'react'
import { TransformWrapper, TransformComponent, useControls } from 'react-zoom-pan-pinch'
import { Upload, ZoomIn, ZoomOut, Maximize } from 'lucide-react'
import { useStore } from '../store'
import { TEXTURES } from '../textures'

const ZOOM_MIN = 0.1
const ZOOM_MAX = 10

// Convierte forma PS (Y invertido) a path SVG
function formaToSVGPath(forma, alto) {
  return forma
    .map((cmd) => {
      const y = alto - cmd.y
      if (cmd.tipo === 'moveto')    return `M ${cmd.x} ${y}`
      if (cmd.tipo === 'lineto')    return `L ${cmd.x} ${y}`
      if (cmd.tipo === 'closepath') return 'Z'
      return ''
    })
    .join(' ')
}

// Controles de zoom — dentro del contexto TransformWrapper
function ZoomControls() {
  const { zoomIn, zoomOut, resetTransform } = useControls()
  return (
    <div className="absolute bottom-4 right-4 flex items-center gap-1 bg-surface rounded-full px-2 py-1.5 shadow-md border border-border-light z-20">
      <button
        onClick={() => zoomOut()}
        className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-surface-hover text-secondary hover:text-primary transition-colors"
        title="Alejar"
      >
        <ZoomOut size={14} />
      </button>
      <button
        onClick={() => resetTransform()}
        className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-surface-hover text-secondary hover:text-primary transition-colors"
        title="Restablecer vista"
      >
        <Maximize size={13} />
      </button>
      <button
        onClick={() => zoomIn()}
        className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-surface-hover text-secondary hover:text-primary transition-colors"
        title="Acercar"
      >
        <ZoomIn size={14} />
      </button>
    </div>
  )
}

export function Canvas() {
  const fileInputRef = useRef(null)
  const {
    imagenUrl, imagenSize, capas, capaActivaId,
    cargando, setProyecto, setCargando, setError, setCapaActiva, buildDetectionForm,
  } = useStore()

  const { ancho, alto } = imagenSize
  const capaActiva = capas.find((c) => c.id === capaActivaId) ?? null

  // IDs de texturas reales usadas en alguna capa visible con spot=texture
  const usedTexturas = [
    ...new Set(
      capas
        .filter((c) => c.spot === 'texture' && c.texturaId && c.visible)
        .map((c) => c.texturaId)
    ),
  ]

  async function handleImageUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setCargando(true)
    setError(null)
    try {
      const localUrl = URL.createObjectURL(file)
      const res = await fetch('/api/detect-color-zones', {
        method: 'POST',
        body:   buildDetectionForm(file),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: res.statusText }))
        throw new Error(err.detail ?? 'Error del servidor')
      }
      const data = await res.json()
      setProyecto({
        proyectoId: data.id,
        nombre:     data.nombre,
        imagenUrl:  localUrl,
        ancho:      data.documento.ancho,
        alto:       data.documento.alto,
        capas:      data.capas,
      })
    } catch (err) {
      setError(err.message)
    } finally {
      setCargando(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const boardStyle = {
    backgroundImage: `
      linear-gradient(45deg, var(--color-surface) 25%, transparent 25%),
      linear-gradient(-45deg, var(--color-surface) 25%, transparent 25%),
      linear-gradient(45deg, transparent 75%, var(--color-surface) 75%),
      linear-gradient(-45deg, transparent 75%, var(--color-surface) 75%)
    `,
    backgroundSize:     '20px 20px',
    backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px',
  }

  // ── Estado vacío: zona de drop ─────────────────────────────────────────
  if (!imagenUrl) {
    return (
      <main
        className="flex-1 flex items-center justify-center bg-canvas-board relative overflow-hidden"
        style={boardStyle}
      >
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={cargando}
          className="flex flex-col items-center justify-center w-[400px] h-[300px] border-2 border-dashed
            border-border-strong rounded-xl bg-surface-elevated/50 hover:bg-surface
            transition-colors duration-200 select-none cursor-pointer disabled:opacity-50"
        >
          {cargando ? (
            <svg className="w-12 h-12 text-muted mb-4 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
          ) : (
            <Upload size={48} className="text-muted mb-4" />
          )}
          <h2 className="text-xl font-medium text-primary mb-2 font-outfit">
            {cargando ? 'Detectando zonas...' : 'Sube una imagen'}
          </h2>
          <p className="text-sm text-secondary">Haz clic para seleccionar</p>
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="hidden"
          onChange={handleImageUpload}
        />
      </main>
    )
  }

  // ── Canvas con imagen ──────────────────────────────────────────────────
  return (
    <main
      className="flex-1 relative overflow-hidden bg-canvas-board cursor-grab active:cursor-grabbing"
      style={boardStyle}
    >
      <TransformWrapper
        initialScale={1}
        minScale={ZOOM_MIN}
        maxScale={ZOOM_MAX}
        centerOnInit={true}
        centerZoomedOut={true}
        limitToBounds={false}
        wheel={{ step: 0.05 }}
        panning={{ velocityDisabled: true }}
      >
        <TransformComponent wrapperStyle={{ width: '100%', height: '100%' }}>
          <div
            className="relative"
            style={{
              width:     ancho,
              height:    alto,
              boxShadow: '0 12px 40px rgba(0,0,0,0.35), 0 4px 12px rgba(0,0,0,0.2)',
            }}
          >
            {/* Imagen base */}
            <img
              draggable={false}
              src={imagenUrl}
              alt="canvas"
              style={{
                display:  'block',
                width:    ancho,
                height:   alto,
                position: 'absolute',
                top: 0, left: 0,
              }}
            />

            {/* SVG de overlays */}
            <svg
              style={{
                position: 'absolute',
                top: 0, left: 0,
                width: ancho, height: alto,
                overflow: 'visible',
                pointerEvents: 'none',
              }}
              viewBox={`0 0 ${ancho} ${alto}`}
            >
              <defs>
                {/* Un pattern SVG por cada textura real en uso */}
                {usedTexturas.map((texId) => {
                  const tex = TEXTURES.find((t) => t.id === texId)
                  if (!tex?.thumb) return null
                  return (
                    <pattern
                      key={tex.id}
                      id={`tex-${tex.id}`}
                      patternUnits="userSpaceOnUse"
                      width="400"
                      height="400"
                    >
                      <image
                        href={tex.thumb}
                        width="400"
                        height="400"
                        preserveAspectRatio="xMidYMid slice"
                        opacity="0.75"
                      />
                    </pattern>
                  )
                })}
              </defs>

              {/* Capas con spot asignado */}
              {capas
                .filter((c) => c.visible && c.spot !== null)
                .map((capa) =>
                  capa.zonas.map((zona) => {
                    const d = formaToSVGPath(zona.forma, alto)
                    return (
                      <g key={zona.id}>
                        {/* Relleno de color base */}
                        <path
                          d={d}
                          fill={capa.color}
                          fillOpacity={0.28}
                          stroke={capa.color}
                          strokeWidth={1.5}
                          strokeOpacity={0.75}
                        />
                        {/* Overlay de textura si la capa tiene texturaId con imagen real */}
                        {capa.spot === 'texture' && capa.texturaId && (() => {
                          const tex = TEXTURES.find((t) => t.id === capa.texturaId)
                          if (!tex?.thumb) return null
                          return (
                            <path
                              d={d}
                              fill={`url(#tex-${capa.texturaId})`}
                              style={{ mixBlendMode: 'multiply' }}
                            />
                          )
                        })()}
                      </g>
                    )
                  })
                )}

              {/* Capa activa resaltada con borde discontinuo */}
              {capaActiva &&
                capaActiva.zonas.map((zona) => (
                  <path
                    key={`active-${zona.id}`}
                    d={formaToSVGPath(zona.forma, alto)}
                    fill={capaActiva.color}
                    fillOpacity={0.40}
                    stroke="white"
                    strokeWidth={2}
                    strokeDasharray="5 2.5"
                  />
                ))}
            </svg>

            {/* Capa invisible para seleccionar capa por click en su color/zona */}
            <svg
              style={{
                position: 'absolute',
                top: 0, left: 0,
                width: ancho, height: alto,
                overflow: 'visible',
              }}
              viewBox={`0 0 ${ancho} ${alto}`}
            >
              {capas
                .filter((c) => c.visible)
                .map((capa) =>
                  capa.zonas.map((zona) => (
                    <path
                      key={`hit-${capa.id}-${zona.id}`}
                      d={formaToSVGPath(zona.forma, alto)}
                      fill="transparent"
                      stroke="transparent"
                      strokeWidth={6}
                      style={{ cursor: 'pointer', pointerEvents: 'all' }}
                      onClick={() => setCapaActiva(capa.id)}
                    />
                  ))
                )}
            </svg>
          </div>
        </TransformComponent>

        <ZoomControls />
      </TransformWrapper>
    </main>
  )
}
