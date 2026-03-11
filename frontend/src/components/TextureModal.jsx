// TextureModal.jsx — selector de textura en modal
import { useState } from 'react'
import { createPortal } from 'react-dom'
import { X, Search } from 'lucide-react'
import { TEXTURES } from '../textures'

export function TextureModal({ capaId, capaColor, onSelect, onClose }) {
  const [search, setSearch] = useState('')

  const filtered = TEXTURES.filter((t) =>
    t.name.toLowerCase().includes(search.toLowerCase())
  )

  if (typeof document === 'undefined') return null

  return createPortal(
    // Backdrop
    <div
      className="fixed inset-0 z-[100] grid place-items-center bg-black/60 backdrop-blur-sm p-4 max-md:p-2.5"
      onClick={onClose}
    >
      {/* Panel */}
      <div
        className="relative bg-surface border border-border-strong rounded-xl shadow-2xl
          w-[420px] max-w-[96vw] max-h-[85vh] flex flex-col overflow-hidden
          max-md:w-[330px] max-md:max-w-[92vw] max-md:max-h-[80vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border-strong shrink-0 max-md:px-4 max-md:py-3">
          <div className="flex items-center gap-2.5">
            <div
              className="w-4 h-4 rounded-sm border border-black/10 shrink-0"
              style={{ background: capaColor }}
            />
            <div>
              <p className="text-[13px] font-semibold text-primary max-md:text-[12px]">Seleccionar textura</p>
              <p className="text-[11px] text-muted">Canal TEXTURE</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-muted hover:text-primary transition-colors p-1 rounded-md hover:bg-surface-hover"
          >
            <X size={16} />
          </button>
        </div>

        {/* Search */}
        <div className="px-5 py-3 border-b border-border-strong shrink-0 max-md:px-4 max-md:py-2.5">
          <div className="relative flex items-center">
            <Search size={13} className="absolute left-3 text-muted pointer-events-none" />
            <input
              type="text"
              placeholder="Buscar textura..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-border-light
                bg-surface-elevated text-primary text-[13px] max-md:text-[16px] outline-none
                transition-colors focus:border-accent focus:ring-1 focus:ring-accent/30
                placeholder:text-muted"
            />
          </div>
        </div>

        {/* Grid */}
        <div className="overflow-y-auto p-4 flex-1 max-md:p-3">
          {filtered.length === 0 ? (
            <p className="text-center text-muted text-[13px] py-6">Sin resultados</p>
          ) : (
            <div className="grid grid-cols-3 gap-3 max-md:grid-cols-2 max-md:gap-2.5">
              {filtered.map((tex) => (
                <button
                  key={tex.id}
                  title={tex.name}
                  onClick={() => onSelect(capaId, tex.id, tex.disp)}
                  className="group flex flex-col rounded-lg border border-border-light overflow-hidden
                    transition-all duration-200 md:hover:border-accent md:hover:shadow-md md:hover:scale-[1.03]
                    bg-surface-elevated cursor-pointer"
                >
                  <div
                    className="h-[64px] w-full overflow-hidden max-md:h-[58px]"
                    style={tex.thumb ? {} : tex.style}
                  >
                    {tex.thumb && (
                      <img
                        src={tex.thumb}
                        alt={tex.name}
                        className="w-full h-full object-cover md:group-hover:scale-110 transition-transform duration-300"
                        draggable={false}
                      />
                    )}
                  </div>
                  <div className="px-2 py-1.5">
                    <span className="text-[11px] text-primary font-medium leading-tight line-clamp-1">
                      {tex.name}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-border-strong shrink-0 max-md:px-4 max-md:py-2.5">
          <button
            onClick={onClose}
            className="w-full text-[13px] text-muted hover:text-primary transition-colors py-1"
          >
            Cancelar — mantener sin textura
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
