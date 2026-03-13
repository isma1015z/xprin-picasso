import { createPortal } from 'react-dom'
import { AlertCircle, Save, Trash2, X } from 'lucide-react'

export function ConfirmExitModal({ open, onSave, onDiscard, onCancel, title, description }) {
  if (!open || typeof document === 'undefined') return null

  const modalTitle = title || "¿Cerrar proyecto actual?"
  const modalDesc = description || "Aún tienes cambios sin guardar en \"Mis proyectos\"."

  return createPortal(
    <div className="fixed inset-0 z-[200] grid place-items-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div 
        className="bg-surface border border-border-strong rounded-xl shadow-2xl w-[400px] max-w-full overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-2 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-3 p-5 border-b border-border-strong bg-accent/5">
          <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center shrink-0">
            <AlertCircle size={22} className="text-accent" />
          </div>
          <div>
            <h3 className="text-[15px] font-bold text-primary">{modalTitle}</h3>
            <p className="text-[12px] text-muted">{modalDesc}</p>
          </div>
        </div>

        {/* Content */}
        <div className="p-5">
          <p className="text-[13px] text-secondary leading-relaxed">
            Si cierras el proyecto sin guardar, el borrador temporal se eliminará de este navegador.
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2 p-5 pt-0">
          <button
            onClick={onSave}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-accent hover:bg-accent-hover text-white rounded-lg font-semibold text-[13px] transition-colors"
          >
            <Save size={16} />
            Sí, guardar y cerrar
          </button>
          
          <button
            onClick={onDiscard}
            className="w-full flex items-center justify-center gap-2 py-2.5 border border-red-500/30 hover:bg-red-500/5 text-red-500 rounded-lg font-medium text-[13px] transition-all"
          >
            <Trash2 size={16} />
            No guardar, eliminar todo
          </button>

          <button
            onClick={onCancel}
            className="w-full py-2 text-[13px] text-muted hover:text-primary transition-colors mt-1"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
