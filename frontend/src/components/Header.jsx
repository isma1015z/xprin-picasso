// Header — diseño de Prueba_EditorPicasso + funcionalidad XPRIN-Picasso
import { useRef, useState } from 'react'
import { Upload, Sun, Moon, FileDown, ChevronDown, LogOut } from 'lucide-react'
import { useStore } from '../store'
import { useDetectar } from '../useDetectar'
import { DetectionSettings } from './DetectionSettings'
import logoBlanco from '../assets/images/Logo_Blanco.png'
import logoNegro from '../assets/images/Logo_Negro.png'

export function Header({ theme, toggleTheme }) {
  const fileInputRef  = useRef(null)
  const [exportMenu, setExportMenu] = useState(false)
  const {
    imagenUrl, capas, cargando, exportandoPDF, errorMsg,
    setExportandoPDF, setError, resetEditor,
    getProyectoJSON, proyectoNombre,
  } = useStore()

  const { detectar } = useDetectar()

  // ── Subir imagen ──────────────────────────────────────────────────────────
  async function handleImageUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return
    await detectar(file)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  // ── Exportar PDF ──────────────────────────────────────────────────────────
  async function handleExport({ embedImagen = true, preview = false } = {}) {
    setExportMenu(false)
    const spots = capas.filter((c) => c.spot !== null)
    if (!spots.length) {
      setError('Asigna al menos una capa a un spot antes de exportar.')
      return
    }
    setExportandoPDF(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (preview)      params.set('preview', 'true')
      if (!embedImagen) params.set('embed_imagen', 'false')

      const res = await fetch(`/api/export-pdf?${params}`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(getProyectoJSON()),
      })
      if (!res.ok) {
        const raw = await res.text()
        let detail = raw || res.statusText
        try { detail = JSON.parse(raw).detail ?? detail } catch {}
        throw new Error(detail)
      }
      const blob = await res.blob()
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href     = url
      a.download = `${proyectoNombre || 'proyecto'}${preview ? '_preview' : '_spots'}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      setError(err.message)
    } finally {
      setExportandoPDF(false)
    }
  }

  const spotCount = capas.filter((c) => c.spot !== null).length
  const logoSrc   = theme === 'dark' ? logoBlanco : logoNegro

  return (
    <header className="flex items-center justify-between h-[60px] px-6 bg-surface border-b border-border-strong shadow-sm z-10 w-full shrink-0">

      {/* Logo + nombre proyecto */}
      <div className="flex items-center gap-4">
        <div className="h-6 w-28 flex items-center">
          <img
            src={logoSrc}
            alt="XPRIN-Picasso"
            className="h-full w-full object-contain select-none"
            draggable={false}
          />
        </div>
        {proyectoNombre && (
          <>
            <div className="w-px h-5 bg-border-strong" />
            <span className="text-sm text-secondary truncate max-w-48">{proyectoNombre}</span>
          </>
        )}
      </div>

      {/* Acciones centrales */}
      <div className="flex items-center gap-2">

        {/* Subir imagen */}
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={cargando}
          className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium border border-border-light
            bg-surface-elevated text-secondary hover:bg-surface-hover hover:text-primary hover:border-border-strong
            transition-all duration-200 disabled:opacity-50 cursor-pointer"
        >
          {cargando
            ? <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/></svg>
            : <Upload size={15} />
          }
          {cargando ? 'Detectando...' : imagenUrl ? 'Cambiar imagen' : 'Subir imagen'}
        </button>
        <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/webp"
          className="hidden" onChange={handleImageUpload} />

        {/* Ajustes detección */}
        <DetectionSettings />

        {/* Exportar PDF */}
        {imagenUrl && (
          <div className="relative">
            <div className={`flex rounded-md overflow-hidden border transition-all duration-200
              ${spotCount === 0 ? 'opacity-40 pointer-events-none' : ''}
              ${exportandoPDF ? 'opacity-70 pointer-events-none' : ''}`}
            >
              <button
                onClick={() => handleExport({ embedImagen: true })}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium
                  bg-accent text-white hover:bg-accent-hover transition-colors cursor-pointer"
              >
                {exportandoPDF
                  ? <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/></svg>
                  : <FileDown size={15} />
                }
                {exportandoPDF ? 'Generando...' : 'Exportar PDF'}
              </button>
              <button
                onClick={() => setExportMenu((v) => !v)}
                className="flex items-center justify-center px-2 py-2 bg-accent hover:bg-accent-hover
                  text-white border-l border-white/20 transition-colors cursor-pointer"
              >
                <ChevronDown size={13} className={`transition-transform ${exportMenu ? 'rotate-180' : ''}`} />
              </button>
            </div>

            {exportMenu && (
              <div className="absolute top-full right-0 mt-1 z-50 w-56 bg-surface rounded-lg shadow-xl
                border border-border-strong overflow-hidden"
                onMouseLeave={() => setExportMenu(false)}
              >
                <button onClick={() => handleExport({ embedImagen: true })}
                  className="w-full text-left px-4 py-2.5 text-sm text-primary hover:bg-surface-hover transition-colors cursor-pointer">
                  <div className="font-medium">Con imagen</div>
                  <div className="text-xs text-muted">PDF completo para revisión</div>
                </button>
                <div className="border-t border-border-light" />
                <button onClick={() => handleExport({ embedImagen: false })}
                  className="w-full text-left px-4 py-2.5 text-sm text-primary hover:bg-surface-hover transition-colors cursor-pointer">
                  <div className="font-medium">Solo spots (RIP)</div>
                  <div className="text-xs text-muted">Sin imagen — más ligero para el RIP</div>
                </button>
                <div className="border-t border-border-light" />
                <button onClick={() => handleExport({ embedImagen: true, preview: true })}
                  className="w-full text-left px-4 py-2.5 text-sm text-primary hover:bg-surface-hover transition-colors cursor-pointer">
                  <div className="font-medium">Preview (RGB)</div>
                  <div className="text-xs text-muted">Spots en color para verificar</div>
                </button>
              </div>
            )}
          </div>
        )}

        {/* Error inline */}
        {errorMsg && (
          <span className="text-xs text-accent max-w-xs truncate" title={errorMsg}>{errorMsg}</span>
        )}
      </div>

      {/* Derecha */}
      <div className="flex items-center gap-3">
        {capas.length > 0 && (
          <span className="text-xs text-muted select-none">
            {spotCount}/{capas.length} spots
          </span>
        )}
        <button
          onClick={toggleTheme}
          className="flex items-center justify-center w-9 h-9 rounded-full text-secondary
            hover:bg-surface-elevated hover:text-primary transition-all duration-200 cursor-pointer"
        >
          {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
        </button>
        {imagenUrl && (
          <button
            onClick={resetEditor}
            className="flex items-center gap-2 px-4 py-2 bg-surface-elevated text-secondary border border-border-light
              rounded-md text-sm font-medium transition-all duration-200 hover:bg-surface-hover hover:text-primary
              hover:border-border-strong cursor-pointer"
          >
            <LogOut size={15} />
            Reiniciar
          </button>
        )}
      </div>
    </header>
  )
}
