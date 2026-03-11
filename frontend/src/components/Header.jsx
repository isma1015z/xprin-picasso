// Header — diseño de Prueba_EditorPicasso + funcionalidad XPRIN-Picasso
// Subir imagen · Ajustes de detección · Exportar PDF · Tema

import { useRef, useState } from 'react'
import { Upload, Sun, Moon, FileDown, ChevronDown, LogOut } from 'lucide-react'
import { useStore } from '../store'
import { DetectionSettings } from './DetectionSettings'
import lapiz from '../assets/images/lapiz.png'
import lapizBlanco from '../assets/images/lapizBlanco.png'

export function Header({ theme, toggleTheme }) {
  const fileInputRef = useRef(null)
  const [exportMenu, setExportMenu] = useState(false)
  const {
    imagenUrl, capas, cargando, exportandoPDF, errorMsg,
    setProyecto, setCargando, setExportandoPDF, setError, resetEditor,
    getProyectoJSON, proyectoNombre, setProyectoNombre, buildDetectionForm,
  } = useStore()

  // ── Subir imagen ──────────────────────────────────────────────────────────
  async function handleImageUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setCargando(true)
    setError(null)
    try {
      const localUrl = URL.createObjectURL(file)
      const res = await fetch('/api/detect-color-zones', {
        method: 'POST',
        body: buildDetectionForm(file),
      })
      if (!res.ok) {
        const raw = await res.text()
        let detail = raw || res.statusText || 'Error del servidor'
        try { detail = JSON.parse(raw).detail ?? detail } catch { }
        throw new Error(detail)
      }
      const data = await res.json()
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

  // ── Exportar PDF ─────────────────────────────────────────────────────────
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
      if (preview) params.set('preview', 'true')
      if (!embedImagen) params.set('embed_imagen', 'false')

      const res = await fetch(`/api/export-pdf?${params}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(getProyectoJSON()),
      })
      if (!res.ok) {
        const raw = await res.text()
        let detail = raw || res.statusText
        try { detail = JSON.parse(raw).detail ?? detail } catch { }
        throw new Error(detail)
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${proyectoNombre || 'proyecto'}${preview ? '_preview' : ''}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      setError(err.message)
    } finally {
      setExportandoPDF(false)
    }
  }

  const spotCount = capas.filter((c) => c.spot !== null).length

  return (
    /* Agregué 'relative' al contenedor principal del header */
    <header className="flex items-center justify-between h-[60px] px-6 bg-surface border-b border-border-strong shadow-sm z-10 w-full shrink-0 relative">

      {/* 1. Izquierda: Logo + nombre proyecto*/}
      <div className="flex items-center gap-4 flex-1">
        <span className="font-bold text-accent text-lg font-outfit tracking-tight select-none">
          XPRIN-Picasso
        </span>
        {imagenUrl && (
          <>
            <div className="w-px h-5 bg-border-strong" />
            <div className="relative inline-block w-[210px]">
              <input
                type="text"
                value={proyectoNombre || ''} /* Añadí || '' por si proyectoNombre es null */
                onChange={(e) => setProyectoNombre(e.target.value)}
                className="text-sm text-secondary bg-transparent border border-transparent hover:border-border-light focus:border-accent focus:outline-none rounded pl-1.5 pr-8 py-0.5 w-full transition-colors"
                title="Renombrar archivo PDF"
              />
              <img
                src={theme === 'dark' ? lapizBlanco : lapiz}
                alt="Editar"
                className="w-5 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none transition-all duration-200"
              />
            </div>
          </>
        )}
      </div>

      {/* 2. Centro: Acciones estrictamente centradas (Agregué absolute) */}
      <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2">
        {/* Subir imagen */}
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={cargando}
          className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium border border-border-light
            bg-surface-elevated text-secondary hover:bg-surface-hover hover:text-primary hover:border-border-strong
            transition-all duration-200 disabled:opacity-50 cursor-pointer"
        >
          {cargando
            ? <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" /></svg>
            : <Upload size={15} />
          }
          {cargando ? 'Detectando...' : imagenUrl ? 'Cambiar imagen' : 'Subir imagen'}
        </button>
        <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/webp"
          className="hidden" onChange={handleImageUpload} />

        {/* Ajustes detección */}
        <DetectionSettings />

        {/* Error inline (Mantenido aquí por si ocurre durante la subida/detección) */}
        {errorMsg && (
          <span className="text-xs text-accent max-w-xs truncate" title={errorMsg}>{errorMsg}</span>
        )}
      </div>

      {/* 3. Derecha: Exportar + contador spots + tema + reset (Agregué flex-1 y justify-end) */}
      <div className="flex items-center justify-end gap-3 flex-1">

        {/* Exportar PDF (Movido a la zona derecha para que no empuje el centro) */}
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
                title="Exportar PDF con imagen embebida"
              >
                {exportandoPDF
                  ? <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" /></svg>
                  : <FileDown size={15} />
                }
                {exportandoPDF ? 'Generando...' : 'Exportar PDF'}
              </button>
              <button
                onClick={() => setExportMenu((v) => !v)}
                className="flex items-center justify-center px-2 py-2 bg-accent hover:bg-accent-hover
                  text-white border-l border-white/20 transition-colors cursor-pointer"
                title="Opciones de exportación"
              >
                <ChevronDown size={13} className={`transition-transform ${exportMenu ? 'rotate-180' : ''}`} />
              </button>
            </div>

            {exportMenu && (
              <div className="absolute top-full right-0 mt-1 z-50 w-56 bg-surface rounded-lg shadow-xl
                border border-border-strong overflow-hidden"
                onMouseLeave={() => setExportMenu(false)}
              >
                <button
                  onClick={() => handleExport({ embedImagen: true })}
                  className="w-full text-left px-4 py-2.5 text-sm text-primary hover:bg-surface-hover
                    transition-colors cursor-pointer"
                >
                  <div className="font-medium">Con imagen</div>
                  <div className="text-xs text-muted">PDF completo para revisión</div>
                </button>
                <div className="border-t border-border-light" />
                <button
                  onClick={() => handleExport({ embedImagen: false })}
                  className="w-full text-left px-4 py-2.5 text-sm text-primary hover:bg-surface-hover
                    transition-colors cursor-pointer"
                >
                  <div className="font-medium">Solo spots (RIP)</div>
                  <div className="text-xs text-muted">Sin imagen — más ligero para el RIP</div>
                </button>
                <div className="border-t border-border-light" />
                <button
                  onClick={() => handleExport({ embedImagen: true, preview: true })}
                  className="w-full text-left px-4 py-2.5 text-sm text-primary hover:bg-surface-hover
                    transition-colors cursor-pointer"
                >
                  <div className="font-medium">Preview (RGB)</div>
                  <div className="text-xs text-muted">Spots en color para verificar</div>
                </button>
              </div>
            )}
          </div>
        )}

        {capas.length > 0 && (
          <span className="text-xs text-muted select-none">
            {spotCount}/{capas.length} spots
          </span>
        )}

        <button
          onClick={toggleTheme}
          aria-label="Toggle theme"
          className="flex items-center justify-center w-9 h-9 rounded-full text-secondary
            hover:bg-surface-elevated hover:text-primary transition-all duration-200 cursor-pointer"
        >
          {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
        </button>

        {imagenUrl && (
          <button
            onClick={resetEditor}
            title="Reiniciar editor"
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