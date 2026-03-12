// Sidebar — Capas por color · Spots UV unificados
import { useState } from 'react'
import { ChevronDown, ChevronRight, Plus, X } from 'lucide-react'
import { useStore, capaHasChannel, channelFullName } from '../store'
import { TEXTURES } from '../textures'
import { TextureModal } from './TextureModal'

// ── Accordion ──────────────────────────────────────────────────────────────
function AccordionItem({ title, badge, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="border-b border-border-strong">
      <div
        className="flex items-center gap-2 p-4 cursor-pointer select-none hover:bg-surface-hover transition-colors duration-200"
        onClick={() => setOpen(!open)}
      >
        {open
          ? <ChevronDown  size={14} className="text-secondary shrink-0" />
          : <ChevronRight size={14} className="text-secondary shrink-0" />}
        <span className="font-medium text-sm text-primary flex-1">{title}</span>
        {badge != null && <span className="text-xs text-muted font-mono">{badge}</span>}
      </div>
      {open && <div className="flex flex-col gap-3 px-4 pb-4">{children}</div>}
    </div>
  )
}

// ── Slider con label ───────────────────────────────────────────────────────
function SliderRow({ label, value, min, max, step = 1, unit = '', color, onChange }) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <span className="text-[11px] text-muted">{label}</span>
        <span className="text-[11px] text-primary font-mono">{value}{unit}</span>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        onClick={(e) => e.stopPropagation()}
        className="w-full h-1.5 rounded-full cursor-pointer"
        style={{ accentColor: color ?? '#f0b429' }}
      />
    </div>
  )
}

// ── Pill de canal (toggle) ─────────────────────────────────────────────────
function ChannelPill({ channel, active, onClick }) {
  const label = channel.label?.trim() || channel.id
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onClick() }}
      title={`${active ? 'Quitar' : 'Añadir'} ${channelFullName(channel)}`}
      className="text-[11px] px-2 py-0.5 rounded-full font-medium transition-all duration-150 cursor-pointer shrink-0 max-w-[96px] truncate"
      style={active ? {
        background: channel.color + '30',
        color:      channel.color,
        border:     `1px solid ${channel.color}80`,
      } : {
        background: 'transparent',
        color:      '#888',
        border:     '1px solid #555',
        opacity:    0.45,
      }}
    >
      {label}
    </button>
  )
}

// ── Fila de canal en la sección Spots ─────────────────────────────────────
function ChannelRow({ ch, canDelete, capasCount, onDelete, onUpdate }) {
  const [editing, setEditing] = useState(false)
  const fullName = channelFullName(ch)

  return (
    <div
      className="flex flex-col gap-1.5 rounded-lg border border-border-light p-2"
      style={{ borderLeftColor: ch.color, borderLeftWidth: 2 }}
    >
      {/* Cabecera: color · id · label editable · capas · eliminar */}
      <div className="flex items-center gap-1.5">
        <div className="w-3 h-3 rounded-sm shrink-0" style={{ background: ch.color }} />

        {editing ? (
          <input
            autoFocus
            type="text"
            value={ch.label}
            maxLength={20}
            placeholder={ch.id}
            onChange={(e) => onUpdate({ label: e.target.value })}
            onBlur={() => setEditing(false)}
            onKeyDown={(e) => { if (e.key === 'Enter') setEditing(false) }}
            className="flex-1 text-[12px] text-primary bg-surface-elevated border border-accent
              rounded px-1.5 py-0.5 outline-none min-w-0"
          />
        ) : (
          <button
            onClick={() => setEditing(true)}
            className="flex-1 text-left text-[12px] text-primary hover:text-accent transition-colors truncate min-w-0"
            title="Clic para renombrar"
          >
            <span className="font-semibold">{ch.id}</span>
            {ch.label?.trim() && (
              <span className="text-muted ml-1 text-[11px]">{ch.label.trim()}</span>
            )}
          </button>
        )}

        <span className="text-[10px] text-muted font-mono shrink-0">{capasCount}c</span>

        {canDelete && (
          <button
            onClick={onDelete}
            className="text-muted hover:text-red-400 transition-colors p-0.5 rounded shrink-0"
            title={`Eliminar ${ch.id}`}
          >
            <X size={11} />
          </button>
        )}
      </div>

      {/* Slider cantidad de tinta */}
      <SliderRow
        label="Tinta"
        value={ch.inkAmount} min={0} max={100} step={5} unit="%"
        color={ch.color}
        onChange={(v) => onUpdate({ inkAmount: v })}
      />

      {/* Preview nombre final */}
      <p className="text-[10px] text-muted font-mono truncate" title={fullName}>
        → {fullName}
      </p>
    </div>
  )
}

// ── Sidebar principal ──────────────────────────────────────────────────────
export function Sidebar() {
  const {
    capas, capaActivaId, spotChannels,
    setCapaActiva,
    toggleCapaSpot, addSpotChannel, removeSpotChannel, updateSpotChannel,
    asignarTexturaASpot, quitarTexturaDeSpot, asignarTileConfigASpot,
    asignarReliefLayer,
  } = useStore()

  // { capaId, channelId, capaColor } | null
  const [modalTextura, setModalTextura] = useState(null)

  const capasConSpots = capas.filter((c) => (c.spots ?? []).length > 0).length

  function handleTexturaSelect(capaId, channelId, texturaId, texturaSvg) {
    asignarTexturaASpot(capaId, channelId, texturaId, texturaSvg)
    setModalTextura(null)
  }

  return (
    <>
      <aside className="w-[240px] h-full bg-surface border-r border-border-strong flex flex-col overflow-y-auto shadow-[2px_0_8px_rgba(0,0,0,0.08)] shrink-0 max-md:w-full">

        {/* ── CAPAS ───────────────────────────────────────────────────────── */}
        <AccordionItem
          title="Capas por color"
          badge={capas.length > 0 ? `${capasConSpots}/${capas.length}` : null}
        >
          {capas.length === 0 && (
            <p className="text-secondary text-[13px]">Sube una imagen para ver las capas detectadas.</p>
          )}

          <ul className="flex flex-col gap-1 list-none m-0 p-0">
            {capas.map((capa) => {
              const isActive   = capa.id === capaActivaId
              const capaSpots  = capa.spots ?? []
              const hasAnySpot = capaSpots.length > 0

              return (
                <li
                  key={capa.id}
                  onClick={() => setCapaActiva(capa.id)}
                  className={`rounded-lg p-2.5 cursor-pointer transition-all duration-150
                    ${isActive ? 'bg-accent/8 ring-1 ring-accent/30' : 'hover:bg-surface-hover'}`}
                >
                  {/* Nombre + área */}
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-sm shrink-0 border border-black/10" style={{ background: capa.color }} />
                    <span className="text-[13px] text-primary font-medium flex-1 truncate">{capa.nombre}</span>
                    <span className="text-[11px] text-muted shrink-0">{(capa.area_px / 1000).toFixed(1)}k</span>
                  </div>

                  {/* Pills — todos los canales disponibles */}
                  <div className="mt-2 flex flex-wrap gap-1" onClick={(e) => e.stopPropagation()}>
                    {spotChannels.map((ch) => (
                      <ChannelPill
                        key={ch.id}
                        channel={ch}
                        active={capaHasChannel(capa, ch.id)}
                        onClick={() => toggleCapaSpot(capa.id, ch.id)}
                      />
                    ))}
                  </div>

                  {/* Config de textura por cada spot activo */}
                  {capaSpots.map((sp) => {
                    const ch       = spotChannels.find((c) => c.id === sp.channelId)
                    if (!ch) return null
                    const tex      = sp.texturaId ? TEXTURES.find((t) => t.id === sp.texturaId) : null
                    const tileSize = sp.tileSize ?? 80
                    const tileGap  = sp.tileGap  ?? 0

                    return (
                      <div
                        key={sp.channelId}
                        className="mt-2 rounded-md border p-2 flex flex-col gap-1.5"
                        style={{ borderColor: ch.color + '50' }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        {/* Etiqueta spot + chip textura */}
                        <div className="flex items-center gap-1.5">
                          <span
                            className="text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0"
                            style={{ background: ch.color + '25', color: ch.color }}
                          >
                            {ch.label?.trim() || ch.id}
                          </span>

                          <button
                            onClick={() => setModalTextura({ capaId: capa.id, channelId: sp.channelId, capaColor: capa.color })}
                            className="flex-1 flex items-center gap-1 rounded px-1.5 py-0.5 border border-dashed border-border-light hover:border-accent transition-colors group min-w-0"
                            title="Seleccionar textura"
                          >
                            {tex ? (
                              <>
                                <div className="w-4 h-4 rounded-sm overflow-hidden border border-border-light shrink-0 bg-white">
                                  <img src={tex.svg} alt={tex.name} className="w-full h-full object-cover" />
                                </div>
                                <span className="text-[10px] text-muted group-hover:text-primary truncate transition-colors flex-1 text-left">{tex.name}</span>
                              </>
                            ) : (
                              <span className="text-[10px] text-muted group-hover:text-accent transition-colors w-full text-center">+ textura</span>
                            )}
                          </button>

                          {/* Quitar textura */}
                          {tex && (
                            <button
                              onClick={() => quitarTexturaDeSpot(capa.id, sp.channelId)}
                              className="text-muted hover:text-red-400 transition-colors p-0.5 rounded shrink-0"
                              title="Quitar textura"
                            >
                              <X size={10} />
                            </button>
                          )}
                        </div>

                        {/* Sliders solo si hay textura asignada */}
                        {tex && (
                          <>
                            <SliderRow
                              label="Tamaño"
                              value={tileSize} min={10} max={300} step={5} unit="px"
                              color={ch.color}
                              onChange={(v) => asignarTileConfigASpot(capa.id, sp.channelId, { tileSize: v })}
                            />
                            <SliderRow
                              label="Separación"
                              value={tileGap} min={-80} max={150} step={2} unit="px"
                              color={ch.color}
                              onChange={(v) => asignarTileConfigASpot(capa.id, sp.channelId, { tileGap: v })}
                            />
                          </>
                        )}
                      </div>
                    )
                  })}

                  {/* Grosor — pasadas de impresión */}
                  {hasAnySpot && (
                    <div
                      className="mt-2 flex items-center justify-between border-t border-border-light pt-2"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <span className="text-[12px] text-muted">Grosor</span>
                      <div className="flex items-center gap-1.5">
                        <input
                          type="number" min={1} max={999}
                          value={capa.reliefLayers || 1}
                          onChange={(e) => {
                            const v = parseInt(e.target.value, 10)
                            if (!isNaN(v) && v >= 1) asignarReliefLayer(capa.id, v)
                          }}
                          className="w-14 text-[12px] text-center border border-border-light rounded-md px-2 py-1
                            bg-surface-elevated text-primary outline-none focus:border-accent focus:ring-1 focus:ring-accent/30
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
        <AccordionItem
          title="Spots UV"
          badge={`${spotChannels.length}`}
        >
          <div className="flex flex-col gap-2">
            {spotChannels.map((ch) => (
              <ChannelRow
                key={ch.id}
                ch={ch}
                canDelete={spotChannels.length > 1}
                capasCount={capas.filter((c) => capaHasChannel(c, ch.id)).length}
                onDelete={() => removeSpotChannel(ch.id)}
                onUpdate={(patch) => updateSpotChannel(ch.id, patch)}
              />
            ))}
          </div>

          <button
            onClick={() => addSpotChannel()}
            className="mt-1 w-full flex items-center justify-center gap-1.5 text-[12px] text-accent
              hover:text-accent-hover border border-dashed border-accent/40 hover:border-accent
              rounded-lg py-2 transition-colors hover:bg-accent/5"
          >
            <Plus size={12} /> Añadir spot
          </button>

          <p className="text-[10px] text-muted leading-snug">
            Activa spots en cada capa usando las pills de colores. Todos los spots admiten textura.
          </p>
        </AccordionItem>

      </aside>

      {modalTextura && (
        <TextureModal
          capaId={modalTextura.capaId}
          channelId={modalTextura.channelId}
          capaColor={modalTextura.capaColor}
          onSelect={handleTexturaSelect}
          onClose={() => setModalTextura(null)}
        />
      )}
    </>
  )
}
