// TextureModal.jsx — selector de textura SVG (nueva firma con channelId)
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { X, Search } from 'lucide-react'
import { TEXTURES } from '../textures'

export function TextureModal({ capaId, channelId, capaColor, onSelect, onClose }) {
  const [search, setSearch]       = useState('')
  const [isVisible, setIsVisible] = useState(false)
  const closeTimerRef             = useRef(null)

  const filtered = TEXTURES.filter((t) =>
    t.name.toLowerCase().includes(search.toLowerCase())
  )

  useEffect(() => {
    const raf = requestAnimationFrame(() => setIsVisible(true))
    return () => {
      cancelAnimationFrame(raf)
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current)
    }
  }, [])

  function handleClose() {
    setIsVisible(false)
    closeTimerRef.current = setTimeout(() => onClose(), 180)
  }

  if (typeof document === 'undefined') return null

  return createPortal(
    <div
      className={`fixed inset-0 z-[100] grid place-items-center backdrop-blur-sm p-4 max-md:p-2.5
        transition-opacity duration-200 ease-out
        ${isVisible ? 'bg-black/60 opacity-100' : 'bg-black/0 opacity-0'}`}
      onClick={handleClose}
    >
      <div
        className={`relative bg-surface border border-border-strong rounded-xl shadow-2xl
          w-[480px] max-w-[96vw] max-h-[85vh] flex flex-col overflow-hidden
          max-md:w-[340px] max-md:max-w-[92vw] max-md:max-h-[80vh]
          transition-all duration-200 ease-out
          ${isVisible ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-2 scale-[0.98]'}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border-strong shrink-0 max-md:px-4 max-md:py-3">
          <div className="flex items-center gap-2.5">
            <div className="w-4 h-4 rounded-sm border border-black/10 shrink-0" style={{ background: capaColor }} />
            <div>
              <p className="text-[13px] font-semibold text-primary">Seleccionar textura</p>
              <p className="text-[11px] text-muted">
                Canal <span className="font-bold">{channelId}</span> · {TEXTURES.length} patrones
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
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
              autoFocus
              type="text"
              placeholder="Buscar textura..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-border-light
                bg-surface-elevated text-primary text-[13px] outline-none
                focus:border-accent focus:ring-1 focus:ring-accent/30 placeholder:text-muted"
            />
          </div>
        </div>

        {/* Grid */}
        <div className="overflow-y-auto p-4 flex-1 max-md:p-3">
          {filtered.length === 0 ? (
            <p className="text-center text-muted text-[13px] py-6">Sin resultados</p>
          ) : (
            <div className="grid grid-cols-4 gap-2.5 max-md:grid-cols-3 max-md:gap-2">
              {filtered.map((tex) => (
                <button
                  key={tex.id}
                  title={tex.name}
                  onClick={() => onSelect(capaId, channelId, tex.id, tex.svg)}
                  className="group flex flex-col rounded-lg border border-border-light overflow-hidden
                    transition-all duration-200 md:hover:border-accent md:hover:shadow-md md:hover:scale-[1.04]
                    bg-surface-elevated cursor-pointer"
                >
                  <div className="h-[56px] w-full bg-white overflow-hidden flex items-center justify-center max-md:h-[50px]">
                    <img
                      src={tex.svg}
                      alt={tex.name}
                      className="w-full h-full object-cover md:group-hover:scale-110 transition-transform duration-300"
                      draggable={false}
                    />
                  </div>
                  <div className="px-1.5 py-1">
                    <span className="text-[10px] text-primary font-medium leading-tight line-clamp-1">{tex.name}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-border-strong shrink-0">
          <button
            onClick={handleClose}
            className="w-full text-[13px] text-muted hover:text-primary transition-colors py-1"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
