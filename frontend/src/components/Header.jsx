// Header — diseño de Prueba_EditorPicasso + funcionalidad XPRIN-Picasso
// Subir imagen · Ajustes de detección · Exportar PDF · Tema

import { useRef } from 'react'
import { Upload, Sun, Moon, FileDown, Settings2, LogOut } from 'lucide-react'
import { useStore } from '../store'
import { DetectionSettings } from './DetectionSettings'

const API = '/api'

export function Header({ theme, toggleTheme }) {
  const fileInputRef = useRef(null)
  const {
    imagenUrl, capas, cargando, exportandoPDF, errorMsg,
    setProyecto, setCargando, setExportandoPDF, setError, resetEditor,
    getProyectoJSON, proyectoNombre, buildDetectionForm,
  } = useStore()

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
        const err = await res.json().catch(() => ({ detail: res.statusText }))
        throw new Error(err.detail ?? 'Error del servidor')
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

  async function handleExport() {
    const spots = capas.filter((c) => c.spot !== null)
    if (!spots.length) { setError('Asigna al menos una capa a un spot antes de exportar.'); return }
    setExportandoPDF(true)
    setError(null)
    try {
      const res = await fetch('/api/export-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(getProyectoJSON()),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: res.statusText }))
        throw new Error(err.detail ?? 'Error al generar el PDF')
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${proyectoNombre || 'proyecto'}_spots.pdf`
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
    <header className="flex items-center justify-between h-[60px] px-6 bg-surface border-b border-border-strong shadow-sm z-10 w-full shrink-0">

      {/* Logo + nombre proyecto */}
      <div className="flex items-center gap-4">
        <span className="font-bold text-accent text-lg font-outfit tracking-tight select-none">
          XPRIN-Picasso
        </span>
        {proyectoNombre && (
          <>
            <div className="w-px h-5 bg-border-strong" />
            <span className="text-sm text-secondary truncate max-w-48">{proyectoNombre}</span>
          </>
        )}
      </div>

      {/* Acciones centrales */}
      <div className="flex items-center gap-2">

        {/* Cambiar imagen (solo visible si ya hay una imagen) */}
        {imagenUrl && (
          <>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={cargando}
              className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium border border-border-light
                bg-surface-elevated text-secondary hover:bg-surface-hover hover:text-primary hover:border-border-strong
                transition-all duration-200 disabled:opacity-50 cursor-pointer"
            >
              {cargando ? (
                <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
              ) : (
                <Upload size={15} />
              )}
              {cargando ? 'Detectando...' : 'Cambiar imagen'}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={handleImageUpload}
            />
          </>
        )}
        {/* Ajustes detección */}
        <DetectionSettings />

        {/* Exportar PDF */}
        {imagenUrl && (
          <button
            onClick={handleExport}
            disabled={exportandoPDF || spotCount === 0}
            title={spotCount === 0 ? 'Asigna al menos una capa a un spot' : 'Exportar PDF con separaciones UV'}
            className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium
              bg-accent text-white hover:bg-accent-hover
              transition-all duration-200 disabled:opacity-40 cursor-pointer"
          >
            {exportandoPDF ? (
              <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
            ) : (
              <FileDown size={15} />
            )}
            {exportandoPDF ? 'Generando...' : 'Exportar PDF'}
          </button>
        )}

        {/* Error inline */}
        {errorMsg && (
          <span className="text-xs text-accent max-w-xs truncate" title={errorMsg}>{errorMsg}</span>
        )}
      </div>

      {/* Derecha: contador spots + tema + reset */}
      <div className="flex items-center gap-3">
        {capas.length > 0 && (
          <span className="text-xs text-muted">
            {spotCount}/{capas.length} spots
          </span>
        )}

        {/* Toggle tema */}
        <button
          onClick={toggleTheme}
          aria-label="Toggle theme"
          className="flex items-center justify-center w-9 h-9 rounded-full text-secondary
            hover:bg-surface-elevated hover:text-primary transition-all duration-200 cursor-pointer"
        >
          {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
        </button>

        {/* Reset (solo si hay imagen) */}
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
