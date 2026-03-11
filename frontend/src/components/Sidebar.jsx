// Sidebar — Capas por color · Spots UV

import { useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { useStore } from '../store'
import { TEXTURES } from '../textures'
import { TextureModal } from './TextureModal'

const SPOTS = [
  { value: null,      label: 'CMYK',    color: '#868e96' },
  { value: 'w1',      label: 'W1',      color: '#a0a0ab' },
  { value: 'w2',      label: 'W2',      color: '#7b8cde' },
  { value: 'texture', label: 'TEXTURE', color: '#f0b429' },
]

// ── Accordion ──────────────────────────────────────────────────────────────
function AccordionItem({ title, badge, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="border-b border-border-strong">
      <div
        className="flex items-center gap-2 p-4 cursor-pointer select-none transition-colors duration-200 hover:bg-surface-hover"
        onClick={() => setOpen(!open)}
      >
        {open
          ? <ChevronDown  size={14} className="text-secondary shrink-0" />
          : <ChevronRight size={14} className="text-secondary shrink-0" />}
        <span className="font-medium text-sm text-primary flex-1">{title}</span>
        {badge != null && (
          <span className="text-xs text-muted font-mono">{badge}</span>
        )}
      </div>
      {open && (
        <div className="flex flex-col gap-3 px-4 pb-4">
          {children}
        </div>
      )}
    </div>
  )
}

// ── Spot badge ─────────────────────────────────────────────────────────────
function SpotBadge({ spot }) {
  const s = SPOTS.find((x) => x.value === spot)
  if (!s || s.value === null) return null
  return (
    <span
      className="text-[11px] px-2 py-0.5 rounded-full font-medium shrink-0"
      style={{
        background: s.color + '22',
        color:      s.color,
        border:     `1px solid ${s.color}55`,
      }}
    >
      {s.label}
    </span>
  )
}

// ── Sidebar ────────────────────────────────────────────────────────────────
export function Sidebar() {
  const {
    capas, capaActivaId,
    setCapaActiva, asignarSpot, asignarTextura, asignarReliefLayer,
  } = useStore()

  const [modalTextura, setModalTextura] = useState(null)

  const spotCount = capas.filter((c) => c.spot !== null).length

  function handleSpotChange(capaId, value) {
    const spot = value === '' ? null : value
    if (spot === 'texture') {
      const capa = capas.find((c) => c.id === capaId)
      setModalTextura({ capaId, capaColor: capa?.color || '#f0b429' })
      asignarSpot(capaId, 'texture')
    } else {
      asignarSpot(capaId, spot)
    }
  }

  function handleTexturaSelect(capaId, texturaId, texturaDisp) {
    asignarTextura(capaId, texturaId, texturaDisp)
    setModalTextura(null)
  }

  return (
    <>
      <aside className="w-[240px] h-full bg-surface border-r border-border-strong flex flex-col overflow-y-auto shadow-[2px_0_8px_rgba(0,0,0,0.08)] shrink-0 max-md:w-full">

        {/* ── CAPAS ───────────────────────────────────────────────────────── */}
        <AccordionItem
          title="Capas por color"
          badge={capas.length > 0 ? `${spotCount}/${capas.length}` : null}
        >
          {capas.length === 0 && (
            <p className="text-secondary text-[13px]">
              Sube una imagen para ver las capas detectadas.
            </p>
          )}

          <ul className="flex flex-col gap-1 list-none m-0 p-0">
            {capas.map((capa) => {
              const isActive = capa.id === capaActivaId
              const tex = capa.spot === 'texture' && capa.texturaId
                ? TEXTURES.find((t) => t.id === capa.texturaId)
                : null

              return (
                <li
                  key={capa.id}
                  onClick={() => setCapaActiva(capa.id)}
                  className={`rounded-lg p-2.5 cursor-pointer transition-all duration-150
                    ${isActive ? 'bg-accent/8 ring-1 ring-accent/30' : 'hover:bg-surface-hover'}`}
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="w-4 h-4 rounded-sm shrink-0 border border-black/10"
                      style={{ background: capa.color }}
                    />
                    <span className="text-[13px] text-primary font-medium flex-1 truncate">
                      {capa.nombre}
                    </span>
                  <span className="text-[11px] text-muted shrink-0">
                    {(capa.area_px / 1000).toFixed(1)}k
                  </span>
                </div>

                  {/* Selector spot */}
                  <div className="mt-2 flex items-center gap-1.5">
                    <select
                      value={capa.spot ?? ''}
                      onChange={(e) => {
                        e.stopPropagation()
                        handleSpotChange(capa.id, e.target.value)
                      }}
                      onClick={(e) => e.stopPropagation()}
                      className="flex-1 text-[12px] border border-border-light rounded-md px-2 py-1
                        bg-surface-elevated text-primary outline-none transition-colors
                        focus:border-accent focus:ring-1 focus:ring-accent/30 cursor-pointer"
                    >
                      {SPOTS.map((s) => (
                        <option key={s.value ?? 'null'} value={s.value ?? ''}>{s.label}</option>
                      ))}
                    </select>
                    <SpotBadge spot={capa.spot} />
                  </div>

                  {/* Textura asignada — chip clicable para reabrir modal */}
                  {capa.spot === 'texture' && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setModalTextura({ capaId: capa.id, capaColor: capa.color })
                      }}
                      className="mt-1.5 w-full flex items-center gap-1.5 rounded-md px-2 py-1
                        border border-dashed border-border-light hover:border-accent
                        transition-colors group"
                      title="Cambiar textura"
                    >
                      {tex ? (
                        <>
                          <div
                            className="w-5 h-5 rounded-sm overflow-hidden border border-border-light shrink-0"
                            style={tex.thumb ? {} : tex.style}
                          >
                            {tex.thumb && (
                              <img src={tex.thumb} alt={tex.name} className="w-full h-full object-cover" />
                            )}
                          </div>
                          <span className="text-[11px] text-muted group-hover:text-primary truncate transition-colors">
                            {tex.name}
                          </span>
                        </>
                      ) : (
                        <span className="text-[11px] text-muted group-hover:text-accent transition-colors w-full text-center">
                          + Seleccionar textura
                        </span>
                      )}
                    </button>
                  )}

                  {/* Grosor — input numérico libre */}
                  {capa.spot && (
                    <div className="mt-2 flex items-center justify-between border-t border-border-light pt-2">
                      <span className="text-[12px] text-muted">Ajuste de grosor</span>
                      <div className="flex items-center gap-1.5">
                        <input
                          type="number"
                          min={1}
                          max={999}
                          value={capa.reliefLayers || 10}
                          onChange={(e) => {
                            e.stopPropagation()
                            const v = parseInt(e.target.value, 10)
                            if (!isNaN(v) && v >= 1) asignarReliefLayer(capa.id, v)
                          }}
                          onClick={(e) => e.stopPropagation()}
                          className="w-14 text-[12px] text-center border border-border-light rounded-md px-2 py-1
                            bg-surface-elevated text-primary outline-none transition-colors
                            focus:border-accent focus:ring-1 focus:ring-accent/30
                            [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                        />
                        <span className="text-[11px] text-muted">pasadas</span>
                      </div>
                    </div>
                  )}

                  <div className="mt-1 text-[11px] text-muted">
                    {capa.zonas.length} zona{capa.zonas.length !== 1 ? 's' : ''}
                  </div>
                </li>
              )
            })}
          </ul>
        </AccordionItem>

        {/* ── SPOTS UV ────────────────────────────────────────────────────── */}
        <AccordionItem title="Spots UV" defaultOpen={true}>
          <div className="flex flex-col gap-2">
            {SPOTS.filter((s) => s.value !== null).map((s) => {
              const n = capas.filter((c) => c.spot === s.value).length
              return (
                <div key={s.value} className="flex items-center gap-2.5">
                  <div className="w-3 h-3 rounded-sm shrink-0" style={{ background: s.color }} />
                  <span className="text-[13px] text-primary flex-1">{s.label}</span>
                  <span className="text-[11px] text-muted font-mono">{n} capa{n !== 1 ? 's' : ''}</span>
                </div>
              )
            })}
          </div>
        </AccordionItem>

      </aside>

      {/* ── MODAL TEXTURAS ─────────────────────────────────────────────────── */}
      {modalTextura && (
        <TextureModal
          capaId={modalTextura.capaId}
          capaColor={modalTextura.capaColor}
          onSelect={handleTexturaSelect}
          onClose={() => setModalTextura(null)}
        />
      )}
    </>
  )
}
