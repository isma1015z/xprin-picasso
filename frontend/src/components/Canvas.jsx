// Canvas del editor — ocupa todo el espacio disponible, con zoom y pan
// Responsable: Juan

import { useRef, useState, useCallback, useEffect } from 'react'
import { useStore } from '../store'

const ZOOM_MIN  = 0.5
const ZOOM_MAX  = 8
const ZOOM_STEP = 0.0015

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

export function Canvas() {
  const { imagenUrl, imagenSize, capas, capaActivaId } = useStore()
  const { ancho, alto } = imagenSize
  const capaActiva = capas.find((c) => c.id === capaActivaId) ?? null

  // ── Tamaño real del contenedor (dinámico) ─────────────────────────────────
  const wrapRef      = useRef(null)
  const [size, setSize] = useState({ w: 0, h: 0 })

  useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect
      setSize({ w: Math.floor(width), h: Math.floor(height) })
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // ── Zoom / pan ────────────────────────────────────────────────────────────
  const [zoom,   setZoom]   = useState(1)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const dragging = useRef(false)
  const lastPos  = useRef({ x: 0, y: 0 })

  const handleWheel = useCallback((e) => {
    e.preventDefault()
    const rect = wrapRef.current.getBoundingClientRect()
    const cx = e.clientX - rect.left
    const cy = e.clientY - rect.top
    setZoom((prev) => {
      const next   = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, prev - e.deltaY * ZOOM_STEP * prev))
      const factor = next / prev
      setOffset((off) => ({
        x: cx - factor * (cx - off.x),
        y: cy - factor * (cy - off.y),
      }))
      return next
    })
  }, [])

  const handleMouseDown = useCallback((e) => {
    if (e.button !== 0) return
    dragging.current = true
    lastPos.current  = { x: e.clientX, y: e.clientY }
  }, [])

  const handleMouseMove = useCallback((e) => {
    if (!dragging.current) return
    const dx = e.clientX - lastPos.current.x
    const dy = e.clientY - lastPos.current.y
    lastPos.current = { x: e.clientX, y: e.clientY }
    setOffset((off) => ({ x: off.x + dx, y: off.y + dy }))
  }, [])

  const stopDrag = useCallback(() => { dragging.current = false }, [])

  const resetView = useCallback(() => { setZoom(1); setOffset({ x: 0, y: 0 }) }, [])

  // ── Escala base: imagen centrada en el contenedor ─────────────────────────
  const baseScale = (size.w && size.h && ancho && alto)
    ? Math.min(size.w / ancho, size.h / alto) * 0.92   // 4% de margen
    : 1
  const drawW  = ancho * baseScale
  const drawH  = alto  * baseScale
  const baseOffX = size.w ? (size.w - drawW) / 2 : 0
  const baseOffY = size.h ? (size.h - drawH) / 2 : 0

  // Stroke visual consistente independientemente del zoom
  const sw = 1.5 / (baseScale * zoom)

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-gray-100">

      {/* ── Área de dibujo — flex-1, ocupa todo el espacio disponible ─────── */}
      <div
        ref={wrapRef}
        className="flex-1 relative overflow-hidden"
        style={{ cursor: imagenUrl ? 'grab' : 'default' }}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={stopDrag}
        onMouseLeave={stopDrag}
      >
        {!imagenUrl && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="flex flex-col items-center gap-2 text-gray-400">
              <svg className="w-10 h-10 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <p className="text-sm">Sube una imagen para empezar</p>
            </div>
          </div>
        )}

        {imagenUrl && size.w > 0 && (
          <div
            style={{
              position:        'absolute',
              left:            0,
              top:             0,
              width:           '100%',
              height:          '100%',
              transform:       `translate(${offset.x}px, ${offset.y}px) scale(${zoom})`,
              transformOrigin: '0 0',
              willChange:      'transform',
            }}
          >
            {/* Sombra de la imagen */}
            <div
              style={{
                position:  'absolute',
                left:      baseOffX - 4,
                top:       baseOffY - 4,
                width:     drawW + 8,
                height:    drawH + 8,
                borderRadius: 6,
                boxShadow: '0 4px 24px rgba(0,0,0,0.18)',
                background: '#fff',
              }}
            />

            {/* Imagen base */}
            <img
              src={imagenUrl}
              alt="base"
              draggable={false}
              style={{
                position: 'absolute',
                left:     baseOffX,
                top:      baseOffY,
                width:    drawW,
                height:   drawH,
                display:  'block',
              }}
            />

            {/* SVG de overlays */}
            <svg
              style={{
                position: 'absolute',
                left:     baseOffX,
                top:      baseOffY,
                width:    drawW,
                height:   drawH,
                overflow: 'visible',
              }}
              viewBox={`0 0 ${ancho} ${alto}`}
            >
              {capas
                .filter((c) => c.visible && c.spot !== null)
                .map((capa) =>
                  capa.zonas.map((zona) => (
                    <path
                      key={zona.id}
                      d={formaToSVGPath(zona.forma, alto)}
                      fill={capa.color}
                      fillOpacity={0.28}
                      stroke={capa.color}
                      strokeWidth={sw}
                      strokeOpacity={0.75}
                    />
                  ))
                )}

              {capaActiva &&
                capaActiva.zonas.map((zona) => (
                  <path
                    key={`active-${zona.id}`}
                    d={formaToSVGPath(zona.forma, alto)}
                    fill={capaActiva.color}
                    fillOpacity={0.45}
                    stroke="white"
                    strokeWidth={sw * 1.8}
                    strokeDasharray={`${sw * 5} ${sw * 2.5}`}
                  />
                ))}
            </svg>
          </div>
        )}
      </div>

      {/* ── Barra de zoom — solo visible cuando hay imagen ──────────────────── */}
      {imagenUrl && (
        <div className="flex items-center justify-center py-2 flex-shrink-0">
          <div className="flex items-center gap-2 bg-white rounded-full px-3 py-1 shadow-sm border border-gray-200">
            <button
              onClick={() => setZoom((z) => Math.max(ZOOM_MIN, +(z / 1.3).toFixed(2)))}
              className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-500 font-bold text-base leading-none"
              title="Alejar"
            >−</button>

            <button
              onClick={resetView}
              className="text-[11px] font-mono text-gray-500 hover:text-red-600 w-12 text-center transition-colors"
              title="Restablecer vista"
            >
              {Math.round(zoom * 100)}%
            </button>

            <button
              onClick={() => setZoom((z) => Math.min(ZOOM_MAX, +(z * 1.3).toFixed(2)))}
              className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-500 font-bold text-base leading-none"
              title="Acercar"
            >+</button>
          </div>
        </div>
      )}

    </div>
  )
}
