// Barra de herramientas: subir imagen + ajustes de detección + exportar PDF
// Responsable: Andrea + Alejandro

import { useRef } from 'react'
import { useStore } from '../store'
import { DetectionSettings } from './DetectionSettings'

const API = '/api'

export function ToolBar() {
  const fileInputRef = useRef(null)
  const {
    imagenUrl, capas, cargando, exportandoPDF, errorMsg,
    setProyecto, setCargando, setExportandoPDF, setError, resetEditor,
    getProyectoJSON, proyectoNombre, buildDetectionForm,
  } = useStore()

  // ── Subir imagen y detectar zonas ──────────────────────────────────────────
  async function handleImageUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return

    setCargando(true)
    setError(null)

    try {
      const localUrl = URL.createObjectURL(file)
      // buildDetectionForm() incluye todos los params v7 del store
      const formData = buildDetectionForm(file)

      const res = await fetch(`${API}/detect-color-zones`, {
        method: 'POST',
        body: formData,
      })

      if (!res.ok) {
        const raw = await res.text()
        let detail = raw || res.statusText || 'Error del servidor'
        try {
          const err = JSON.parse(raw)
          detail = err.detail ?? detail
        } catch {}
        throw new Error(detail)
      }

      const data = await res.json()

      setProyecto({
        proyectoId:  data.id,
        nombre:      data.nombre,
        imagenUrl:   localUrl,
        ancho:       data.documento.ancho,
        alto:        data.documento.alto,
        capas:       data.capas,
      })
    } catch (err) {
      setError(err.message)
    } finally {
      setCargando(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  // ── Exportar PDF ───────────────────────────────────────────────────────────
  async function handleExport() {
    const spotsAsignados = capas.filter((c) => c.spot !== null)
    if (spotsAsignados.length === 0) {
      setError('Asigna al menos una capa a un spot antes de exportar.')
      return
    }

    setExportandoPDF(true)
    setError(null)

    try {
      const res = await fetch(`${API}/export-pdf`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(getProyectoJSON()),
      })

      if (!res.ok) {
        const raw = await res.text()
        let detail = raw || res.statusText || 'Error al generar el PDF'
        try {
          const err = JSON.parse(raw)
          detail = err.detail ?? detail
        } catch {}
        throw new Error(detail)
      }

      const blob = await res.blob()
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href     = url
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
    <div className="h-12 bg-white border-b border-gray-200 flex items-center px-4 gap-3 shadow-sm">
      {/* Logo */}
      <span className="font-bold text-red-700 text-sm tracking-tight select-none">XPRIN-Picasso</span>
      <div className="w-px h-6 bg-gray-200 mx-1" />

      {/* Botón subir imagen */}
      <button
        onClick={() => fileInputRef.current?.click()}
        disabled={cargando}
        className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium transition-colors disabled:opacity-50"
      >
        {cargando ? (
          <>
            <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
            </svg>
            Detectando...
          </>
        ) : (
          <>
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            {imagenUrl ? 'Cambiar imagen' : 'Subir imagen'}
          </>
        )}
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={handleImageUpload}
      />

      {/* Panel de ajustes de detección ── nuevo v7 */}
      <DetectionSettings />

      {/* Nombre del proyecto */}
      {proyectoNombre && (
        <span className="text-sm text-gray-500 truncate max-w-48 select-none">{proyectoNombre}</span>
      )}

      <div className="flex-1" />

      {/* Error */}
      {errorMsg && (
        <span className="text-xs text-red-600 max-w-xs truncate" title={errorMsg}>{errorMsg}</span>
      )}

      {/* Info spots */}
      {capas.length > 0 && (
        <span className="text-xs text-gray-400 select-none">
          {spotCount}/{capas.length} con spot
        </span>
      )}

      {/* Botón exportar PDF */}
      {imagenUrl && (
        <button
          onClick={handleExport}
          disabled={exportandoPDF || spotCount === 0}
          title={spotCount === 0 ? 'Asigna al menos una capa a un spot' : 'Exportar PDF con separaciones UV'}
          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded bg-red-700 hover:bg-red-800 text-white font-medium transition-colors disabled:opacity-40"
        >
          {exportandoPDF ? (
            <>
              <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
              </svg>
              Generando PDF...
            </>
          ) : (
            <>
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
              Exportar PDF
            </>
          )}
        </button>
      )}

      {/* Reset */}
      {imagenUrl && (
        <button
          onClick={resetEditor}
          className="text-xs text-gray-400 hover:text-gray-600 px-2 transition-colors"
          title="Reiniciar editor"
        >
          ✕
        </button>
      )}
    </div>
  )
}
