// Canvas — react-zoom-pan-pinch + overlays SVG con texturas
// Responsable: Juan

import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { TransformWrapper, TransformComponent, useControls } from 'react-zoom-pan-pinch'
import { Upload, ZoomIn, ZoomOut, Maximize, Save, Check, FolderOpen } from 'lucide-react'
import { useStore } from '../store'
import { TEXTURES } from '../textures'
import { API_URL } from '../config'
import { getCurrentProfileOwner, saveProjectProfile } from '../projectProfiles'
import { getDetectedImageUrl } from '../detectedImageUrl'

const ZOOM_MIN = 0.1
const ZOOM_MAX = 10

// Convierte forma PS (Y invertido) a path SVG
function formaToSVGPath(forma, alto) {
  return forma
    .map((cmd) => {
      const y = alto - cmd.y
      if (cmd.tipo === 'moveto') return `M ${cmd.x} ${y}`
      if (cmd.tipo === 'lineto') return `L ${cmd.x} ${y}`
      if (cmd.tipo === 'closepath') return 'Z'
      return ''
    })
    .join(' ')
}

// Controles de zoom — dentro del contexto TransformWrapper
function ZoomControls({ onSave, onOpenProjects, isSaving, disabled }) {
  const { zoomIn, zoomOut, resetTransform, centerView } = useControls()

  function handleResetView() {
    resetTransform()
    // Asegura recentrado después de soltar cualquier desplazamiento acumulado
    requestAnimationFrame(() => centerView(1, 250))
  }

  return (
    <div className="absolute bottom-4 right-4 z-20 flex items-center gap-2 max-md:left-1/2 max-md:right-auto max-md:w-[calc(100%-14px)] max-md:-translate-x-1/2 max-md:justify-between">
      <button
        onClick={onOpenProjects}
        className="h-10 rounded-full border border-border-light bg-surface-elevated px-4 text-secondary text-sm font-semibold inline-flex items-center gap-2 hover:bg-surface-hover hover:text-primary transition-colors shadow-md cursor-pointer max-md:h-9 max-md:px-3 max-md:text-[12px] max-md:gap-1.5"
        title="Ir a mis proyectos"
      >
        <FolderOpen size={13} />
        Mis proyectos
      </button>
      <button
        onClick={onSave}
        disabled={disabled || isSaving}
        className="h-10 rounded-full border border-border-light bg-accent px-4 text-white text-sm font-semibold inline-flex items-center gap-2 hover:bg-accent-hover transition-colors disabled:opacity-60 disabled:pointer-events-none shadow-md cursor-pointer max-md:h-9 max-md:px-3 max-md:text-[12px] max-md:gap-1.5"
        title="Guardar proyecto"
      >
        {isSaving ? (
          <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
        ) : (
          <Save size={13} />
        )}
        Guardar
      </button>
      <div className="flex items-center gap-1 bg-surface rounded-full px-2 py-1.5 shadow-md border border-border-light max-md:px-1.5 max-md:py-1">
        <button
          onClick={() => zoomOut()}
          className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-surface-hover text-secondary hover:text-primary transition-colors max-md:w-6 max-md:h-6"
          title="Alejar"
        >
          <ZoomOut size={13} />
        </button>
        <button
          onClick={handleResetView}
          className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-surface-hover text-secondary hover:text-primary transition-colors max-md:w-6 max-md:h-6"
          title="Restablecer vista"
        >
          <Maximize size={12} />
        </button>
        <button
          onClick={() => zoomIn()}
          className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-surface-hover text-secondary hover:text-primary transition-colors max-md:w-6 max-md:h-6"
          title="Acercar"
        >
          <ZoomIn size={13} />
        </button>
      </div>
    </div>
  )
}

function SavedModal({ open, onClose }) {
  useEffect(() => {
    if (!open) return
    const t = setTimeout(onClose, 1600)
    return () => clearTimeout(t)
  }, [open, onClose])

  return (
    <div
      className={`fixed inset-0 z-[120] grid place-items-center p-4 transition-all duration-200 ${open ? 'pointer-events-auto bg-black/35 opacity-100' : 'pointer-events-none bg-black/0 opacity-0'}`}
    >
      <div
        className={`w-[320px] max-w-[92vw] rounded-xl border border-border-strong bg-surface p-5 text-center shadow-2xl transition-all duration-250 ${open ? 'translate-y-0 scale-100' : 'translate-y-3 scale-[0.96]'}`}
      >
        <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-500">
          <Check size={22} />
        </div>
        <p className="text-base font-semibold text-primary">Proyecto guardado</p>
        <p className="mt-1 text-sm text-secondary">Lo veras en "Mis imagenes".</p>
      </div>
    </div>
  )
}

export function Canvas() {
  const navigate = useNavigate()
  const fileInputRef = useRef(null)
  const [isSaving, setIsSaving] = useState(false)
  const [showSavedModal, setShowSavedModal] = useState(false)
  const [openingProjects, setOpeningProjects] = useState(false)
  const [openingProjectsProgress, setOpeningProjectsProgress] = useState(0)
  const {
    imagenUrl, imagenSize, capas, capaActivaId,
    cargando, proyectoNombre, savedProfileId, getProyectoJSON, lastFile,
    setProyecto, setCargando, setError, setCapaActiva, setSavedProfileId, buildDetectionForm,
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

  function blobToDataUrl(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result)
      reader.onerror = reject
      reader.readAsDataURL(blob)
    })
  }

  async function handleImageUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setCargando(true)
    setError(null)
    try {
      const localUrl = URL.createObjectURL(file)
      const res = await fetch(`${API_URL}/detect-color-zones`, {
        method: 'POST',
        body: buildDetectionForm(file),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: res.statusText }))
        throw new Error(err.detail ?? 'Error del servidor')
      }
      const data = await res.json()
      const detectedUrl = getDetectedImageUrl(data, localUrl)
      setProyecto({
        proyectoId: data.id,
        nombre: data.nombre,
        imagenUrl: localUrl,
        ancho: data.documento.ancho,
        alto: data.documento.alto,
        capas: data.capas,
      })
    } catch (err) {
      setError(err.message)
    } finally {
      setCargando(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  async function handleSaveProject() {
    if (!imagenUrl || isSaving) return

    setIsSaving(true)
    setError(null)
    const startedAt = Date.now()

    try {
      let sourceBlob = null
      if (lastFile) {
        sourceBlob = lastFile
      } else {
        sourceBlob = await fetch(imagenUrl).then((r) => r.blob())
      }

      const imagenDataUrl = await blobToDataUrl(sourceBlob)
      const ownerId = await getCurrentProfileOwner()

      const savedRecord = await saveProjectProfile({
        ownerId,
        projectId: savedProfileId,
        name: proyectoNombre || 'Proyecto',
        snapshot: {
          version: 1,
          imagenDataUrl,
          project: getProyectoJSON(),
        },
      })
      setSavedProfileId(savedRecord.id)

      const elapsed = Date.now() - startedAt
      if (elapsed < 1000) {
        await new Promise((resolve) => setTimeout(resolve, 1000 - elapsed))
      }
      setShowSavedModal(true)
    } catch (err) {
      setError(err.message || 'No se pudo guardar el proyecto')
    } finally {
      setIsSaving(false)
    }
  }

  async function handleOpenProjects() {
    if (openingProjects) return
    let timer = null
    try {
      setOpeningProjects(true)
      setOpeningProjectsProgress(10)
      const duration = 900
      const startedAt = Date.now()
      timer = setInterval(() => {
        const elapsed = Date.now() - startedAt
        const p = Math.min(95, 10 + Math.round((elapsed / duration) * 85))
        setOpeningProjectsProgress(p)
      }, 60)
      await new Promise((resolve) => setTimeout(resolve, duration))
      setOpeningProjectsProgress(100)
      await new Promise((resolve) => setTimeout(resolve, 120))
      navigate('/proyectos')
    } finally {
      if (timer) clearInterval(timer)
    }
  }

  const boardStyle = {
    backgroundImage: `
      linear-gradient(45deg, var(--color-surface) 25%, transparent 25%),
      linear-gradient(-45deg, var(--color-surface) 25%, transparent 25%),
      linear-gradient(45deg, transparent 75%, var(--color-surface) 75%),
      linear-gradient(-45deg, transparent 75%, var(--color-surface) 75%)
    `,
    backgroundSize: '20px 20px',
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
            transition-colors duration-200 select-none cursor-pointer disabled:opacity-50
            max-md:w-[92vw] max-md:h-[240px]"
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
              width: ancho,
              height: alto,
              boxShadow: '0 12px 40px rgba(0,0,0,0.35), 0 4px 12px rgba(0,0,0,0.2)',
            }}
          >
            {/* Imagen base */}
            <img
              draggable={false}
              src={imagenUrl}
              alt="canvas"
              style={{
                display: 'block',
                width: ancho,
                height: alto,
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

        <ZoomControls
          onSave={handleSaveProject}
          onOpenProjects={handleOpenProjects}
          isSaving={isSaving}
          disabled={!imagenUrl}
        />
      </TransformWrapper>
      <SavedModal open={showSavedModal} onClose={() => setShowSavedModal(false)} />
      <div
        className={`fixed inset-0 z-[125] grid place-items-center p-4 transition-all duration-200 ${openingProjects ? 'pointer-events-auto bg-black/35 backdrop-blur-[1px] opacity-100' : 'pointer-events-none bg-black/0 opacity-0'
          }`}
      >
        <div
          className={`w-[300px] max-w-[90vw] rounded-xl border border-border-strong bg-surface p-4 text-center shadow-2xl transition-all duration-200 ${openingProjects ? 'translate-y-0 scale-100' : 'translate-y-2 scale-[0.98]'
            }`}
        >
          <p className="text-sm font-semibold text-primary">Abriendo mis proyectos...</p>
          <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-surface-elevated">
            <div
              className="h-full rounded-full bg-accent transition-[width] duration-100 ease-out"
              style={{ width: `${openingProjectsProgress}%` }}
            />
          </div>
        </div>
      </div>
    </main>
  )
}
