// Sidebar — diseño accordion de Prueba_EditorPicasso + capas/spots de XPRIN-Picasso
// Secciones: Capas por color · Texturas · Spots UV

import { useState } from 'react'
import { ChevronDown, ChevronRight, Search, Eye, EyeOff } from 'lucide-react'
import { useStore } from '../store'
import { TEXTURES } from '../textures'

const SPOTS = [
  { value: null, label: 'CMYK', color: '#868e96' },
  { value: 'w1', label: 'W1', color: '#a0a0ab' },
  { value: 'w2', label: 'W2', color: '#7b8cde' },
  { value: 'texture', label: 'TEXTURE', color: '#f0b429' },
]

// ── Accordion item ─────────────────────────────────────────────────────────
function AccordionItem({ title, badge, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="border-b border-border-strong">
      <div
        className="flex items-center gap-2 p-4 cursor-pointer select-none transition-colors duration-200 hover:bg-surface-hover"
        onClick={() => setOpen(!open)}
      >
        {open
          ? <ChevronDown size={14} className="text-secondary shrink-0" />
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
        color: s.color,
        border: `1px solid ${s.color}55`,
      }}
    >
      {s.label}
    </span>
  )
}

// ── Sidebar principal ──────────────────────────────────────────────────────
export function Sidebar() {
  const { capas, capaActivaId, setCapaActiva, asignarSpot, toggleVisible, asignarTextura } = useStore()
  const [texSearch, setTexSearch] = useState('')
  const filteredTex = TEXTURES.filter((t) =>
    t.name.toLowerCase().includes(texSearch.toLowerCase())
  )
  const spotCount = capas.filter((c) => c.spot !== null).length
  const capaActiva = capas.find(c => c.id === capaActivaId)

  return (
    <aside className="w-[280px] bg-surface border-r border-border-strong flex flex-col overflow-y-auto shadow-[2px_0_8px_rgba(0,0,0,0.08)] shrink-0">

      {/* ── CAPAS ─────────────────────────────────────────────────────────── */}
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
            return (
              <li
                key={capa.id}
                onClick={() => setCapaActiva(capa.id)}
                className={`rounded-lg p-2.5 cursor-pointer transition-all duration-150
                  ${isActive
                    ? 'bg-accent/8 ring-1 ring-accent/30'
                    : 'hover:bg-surface-hover'
                  }`}
              >
                {/* Fila superior */}
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
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleVisible(capa.id) }}
                    className="text-muted hover:text-primary transition-colors shrink-0"
                    title={capa.visible ? 'Ocultar' : 'Mostrar'}
                  >
                    {capa.visible
                      ? <Eye size={14} />
                      : <EyeOff size={14} />}
                  </button>
                </div>

                {/* Selector spot */}
                <div className="mt-2 flex items-center gap-1.5">
                  <select
                    value={capa.spot ?? ''}
                    onChange={(e) => {
                      e.stopPropagation()
                      asignarSpot(capa.id, e.target.value === '' ? null : e.target.value)
                    }}
                    onClick={(e) => e.stopPropagation()}
                    className="flex-1 text-[12px] border border-border-light rounded-md px-2 py-1
                      bg-surface-elevated text-primary outline-none transition-colors
                      focus:border-accent focus:ring-1 focus:ring-accent/30 cursor-pointer"
                  >
                    {SPOTS.map((s) => (
                      <option key={s.value ?? 'null'} value={s.value ?? ''}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                  <SpotBadge spot={capa.spot} />
                </div>

                <div className="mt-1 text-[11px] text-muted">
                  {capa.zonas.length} zona{capa.zonas.length !== 1 ? 's' : ''}
                </div>
              </li>
            )
          })}
        </ul>
      </AccordionItem>

      {/* ── TEXTURAS ──────────────────────────────────────────────────────── */}
      <AccordionItem title="Texturas" defaultOpen={false}>
        <div className="relative flex items-center">
          <input
            type="text"
            placeholder="Buscar textura..."
            value={texSearch}
            onChange={(e) => setTexSearch(e.target.value)}
            className="w-full py-1.5 pl-3 pr-8 rounded-full border border-border-light
              bg-surface-elevated text-primary outline-none text-[13px]
              transition-colors focus:border-secondary placeholder:text-muted"
          />
          <Search size={14} className="absolute right-2.5 text-muted pointer-events-none" />
        </div>

        <div className="grid grid-cols-3 gap-2 mt-1">
          {filteredTex.map((tex) => {
            const isSelected = capaActiva?.spot === 'texture' && capaActiva?.texturaId === tex.id
            return (
              <button
                key={tex.id}
                title={tex.name}
                onClick={() => {
                  if (capaActivaId) asignarTextura(capaActivaId, tex.id, tex.disp)
                }}
                className={`h-[52px] rounded-md cursor-pointer border transition-all duration-200 hover:scale-105 hover:shadow-md overflow-hidden bg-surface-elevated
                  ${isSelected ? 'border-accent ring-2 ring-accent shadow-md' : 'border-border-light'}`}
                style={tex.thumb ? {} : tex.style}
              >
                {tex.thumb && (
                  <img
                    src={tex.thumb}
                    alt={tex.name}
                    className="w-full h-full object-cover"
                    draggable={false}
                  />
                )}
              </button>
            )
          })}
        </div>

        {filteredTex.length === 0 && (
          <p className="text-muted text-[13px] text-center py-2">Sin resultados</p>
        )}
      </AccordionItem>

      {/* ── SPOTS UV ──────────────────────────────────────────────────────── */}
      <AccordionItem title="Spots UV" defaultOpen={true}>
        <div className="flex flex-col gap-2">
          {SPOTS.filter((s) => s.value !== null).map((s) => {
            const n = capas.filter((c) => c.spot === s.value).length
            return (
              <div key={s.value} className="flex items-center gap-2.5">
                <div
                  className="w-3 h-3 rounded-sm shrink-0"
                  style={{ background: s.color }}
                />
                <span className="text-[13px] text-primary flex-1">{s.label}</span>
                <span className="text-[11px] text-muted font-mono">{n} capa{n !== 1 ? 's' : ''}</span>
              </div>
            )
          })}
        </div>
      </AccordionItem>

    </aside>
  )
}
