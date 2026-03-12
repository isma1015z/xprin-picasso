// Header — diseño de Prueba_EditorPicasso + funcionalidad XPRIN-Picasso
// Subir imagen · Ajustes de detección · Exportar PDF · Tema

import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Upload, Sun, Moon, FileDown, ChevronDown, LogOut, Menu, X } from 'lucide-react'
import { useStore } from '../store'
import { DetectionSettings } from './DetectionSettings'
import lapiz from '../assets/images/lapiz.png'
import lapizBlanco from '../assets/images/lapizBlanco.png'
import logo from '../assets/images/Logo_Negro.png'
import logoBlanco from '../assets/images/Logo_Blanco.png'

export function Header({ theme, toggleTheme, isMobile = false, mobileMenuOpen = false, toggleMobileMenu = () => { } }) {
  const navigate = useNavigate()
  const fileInputRef = useRef(null)
  const [exportMenu, setExportMenu] = useState(false)
  const {
    imagenUrl, capas, cargando, exportandoPDF, errorMsg,
    setProyecto, setCargando, setExportandoPDF, setError, resetEditor,
    getProyectoJSON, proyectoNombre, setProyectoNombre, buildDetectionForm,
  } = useStore()

  const logoSrc = theme === 'dark' ? logoBlanco : logo

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
        try { detail = JSON.parse(raw).detail ?? detail } catch {}
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
      const { lastFile } = useStore.getState() // Obtener el archivo del store
      const fd = new FormData()
      fd.append('proyecto', JSON.stringify(getProyectoJSON()))
      fd.append('preview', String(preview))
      fd.append('embed_imagen', String(embedImagen))
      if (lastFile) {
        fd.append('imagen', lastFile)
      }

      const res = await fetch(`/api/export-pdf`, {
        method: 'POST',
        body: fd,
      })

      if (!res.ok) {
        const raw = await res.text()
        let detail = raw || res.statusText
        try { detail = JSON.parse(raw).detail ?? detail } catch {}
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
    <header className="relative flex items-center justify-between h-[60px] px-6 bg-surface border-b border-border-strong shadow-sm z-10 w-full shrink-0 max-md:px-3">
      <div className="flex items-center gap-4 min-w-0 flex-1">
        <button
          onClick={() => navigate('/proyectos')}
          className="h-6 w-28 flex items-center cursor-pointer"
          title="Ir a mis proyectos"
        >
          <img
            src={logoSrc}
            alt="XPRIN-Picasso"
            className="h-full w-full object-contain select-none"
            draggable={false}
          />
        </button>

        {imagenUrl && (
          <>
            <div className="w-px h-5 bg-border-strong max-md:hidden" />
            <div className="relative inline-block w-[210px] max-md:hidden">
              <input
                type="text"
                value={proyectoNombre || ''}
                onChange={(e) => setProyectoNombre(e.target.value)}
                className="text-sm text-secondary bg-transparent border border-transparent hover:border-border-light focus:border-accent focus:outline-none rounded pl-1.5 pr-8 py-0.5 w-full transition-colors"
                title="Renombrar archivo PDF" placeholder='Nombra tu PDF'
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

      <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2 max-md:hidden">
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={cargando}
          className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium border border-border-light
            bg-surface-elevated text-secondary hover:bg-surface-hover hover:text-primary hover:border-border-strong
            transition-all duration-200 disabled:opacity-50 cursor-pointer whitespace-nowrap"
        >
          {cargando
            ? <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" /></svg>
            : <Upload size={15} />
          }
          {cargando ? 'Detectando...' : imagenUrl ? 'Cambiar imagen' : 'Subir imagen'}
        </button>
        <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={handleImageUpload} />

        <DetectionSettings />

        {errorMsg && (
          <span className="text-xs text-accent max-w-xs truncate" title={errorMsg}>{errorMsg}</span>
        )}
      </div>

      <div className="flex items-center justify-end gap-3 flex-1 max-md:gap-2">
        {imagenUrl && (
          <div className="relative max-md:hidden">
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
              <div
                className="absolute top-full right-0 mt-1 z-50 w-56 bg-surface rounded-lg shadow-xl border border-border-strong overflow-hidden"
                onMouseLeave={() => setExportMenu(false)}
              >
                <button onClick={() => handleExport({ embedImagen: true })} className="w-full text-left px-4 py-2.5 text-sm text-primary hover:bg-surface-hover transition-colors cursor-pointer">
                  <div className="font-medium">Con imagen</div>
                  <div className="text-xs text-muted">PDF completo para revisión</div>
                </button>
                <div className="border-t border-border-light" />
                <button onClick={() => handleExport({ embedImagen: false })} className="w-full text-left px-4 py-2.5 text-sm text-primary hover:bg-surface-hover transition-colors cursor-pointer">
                  <div className="font-medium">Solo spots (RIP)</div>
                  <div className="text-xs text-muted">Sin imagen — más ligero para el RIP</div>
                </button>
                <div className="border-t border-border-light" />
                <button onClick={() => handleExport({ embedImagen: true, preview: true })} className="w-full text-left px-4 py-2.5 text-sm text-primary hover:bg-surface-hover transition-colors cursor-pointer">
                  <div className="font-medium">Preview (RGB)</div>
                  <div className="text-xs text-muted">Spots en color para verificar</div>
                </button>
              </div>
            )}
          </div>
        )}

        {capas.length > 0 && (
          <span className="text-xs text-muted select-none max-md:hidden">
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

        {isMobile && (
          <button
            onClick={toggleMobileMenu}
            className="flex items-center justify-center w-9 h-9 rounded-md text-secondary border border-border-light
              bg-surface-elevated hover:bg-surface-hover hover:text-primary transition-all duration-200 cursor-pointer"
            aria-label={mobileMenuOpen ? 'Cerrar menú' : 'Abrir menú'}
          >
            {mobileMenuOpen ? <X size={17} /> : <Menu size={17} />}
          </button>
        )}

        {imagenUrl && (
          <button
            onClick={resetEditor}
            title="Reiniciar editor"
            className="flex items-center gap-2 px-4 py-2 bg-surface-elevated text-secondary border border-border-light
              rounded-md text-sm font-medium transition-all duration-200 hover:bg-surface-hover hover:text-primary
              hover:border-border-strong cursor-pointer max-md:hidden"
          >
            <LogOut size={15} />
            <span>Reiniciar</span>
          </button>
        )}
      </div>

      {isMobile && (
        <div
          className={`absolute top-full left-0 right-0 z-40 bg-surface border-b border-border-strong shadow-lg px-3 py-2
            transition-all duration-300 ease-out origin-top
            ${mobileMenuOpen ? 'opacity-100 translate-y-0 scale-y-100 pointer-events-auto' : 'opacity-0 -translate-y-2 scale-y-95 pointer-events-none'}`}
        >
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={cargando}
              className="h-10 w-full flex items-center justify-center gap-1.5 px-3 rounded-md text-xs font-medium border border-border-light
                bg-surface-elevated text-secondary hover:bg-surface-hover hover:text-primary hover:border-border-strong
                transition-all duration-200 disabled:opacity-50 cursor-pointer"
            >
              {cargando ? (
                <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" /></svg>
              ) : (
                <Upload size={14} />
              )}
              {imagenUrl ? 'Cambiar imagen' : 'Subir imagen'}
            </button>

            <div className="[&>div]:w-full [&>div>button]:h-10 [&>div>button]:w-full [&>div>button]:justify-center [&>div>button]:px-3 [&>div>button]:text-xs">
              <DetectionSettings />
            </div>


            {imagenUrl && (
              <button
                onClick={() => handleExport({ embedImagen: true })}
                className={`h-10 w-full flex items-center justify-center gap-1.5 px-3 rounded-md text-xs font-medium
                  transition-colors cursor-pointer bg-accent text-white hover:bg-accent-hover
                  ${spotCount === 0 ? 'opacity-40 pointer-events-none' : ''}
                  ${exportandoPDF ? 'opacity-70 pointer-events-none' : ''}`}
              >
                {exportandoPDF ? <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" /></svg> : <FileDown size={14} />}
                Exportar PDF
              </button>
            )}

            {imagenUrl && (
              <button
                onClick={resetEditor}
                className="h-10 w-full flex items-center justify-center gap-1.5 px-3 rounded-md text-xs font-medium
                  border border-border-light bg-surface-elevated text-secondary hover:bg-surface-hover hover:text-primary
                  hover:border-border-strong transition-all duration-200 cursor-pointer"
              >
                <LogOut size={14} />
                Reiniciar
              </button>
            )}
          </div>

          {imagenUrl && (
            <div className="mt-2 relative">
              <button
                onClick={() => setExportMenu((v) => !v)}
                className="h-9 w-full flex items-center justify-center gap-1.5 rounded-md text-[11px] font-medium
                  border border-border-light bg-surface-elevated text-secondary hover:bg-surface-hover hover:text-primary
                  transition-colors cursor-pointer"
              >
                Opciones de exportación
                <ChevronDown size={12} className={`transition-transform ${exportMenu ? 'rotate-180' : ''}`} />
              </button>

              {exportMenu && (
                <div
                  className="absolute top-full left-0 mt-1 z-50 w-full bg-surface rounded-lg shadow-xl border border-border-strong overflow-hidden"
                  onMouseLeave={() => setExportMenu(false)}
                >
                  <button onClick={() => handleExport({ embedImagen: true })} className="w-full text-left px-4 py-2.5 text-sm text-primary hover:bg-surface-hover transition-colors cursor-pointer">
                    <div className="font-medium">Con imagen</div>
                    <div className="text-xs text-muted">PDF completo para revisión</div>
                  </button>
                  <div className="border-t border-border-light" />
                  <button onClick={() => handleExport({ embedImagen: false })} className="w-full text-left px-4 py-2.5 text-sm text-primary hover:bg-surface-hover transition-colors cursor-pointer">
                    <div className="font-medium">Solo spots (RIP)</div>
                    <div className="text-xs text-muted">Sin imagen — más ligero para el RIP</div>
                  </button>
                  <div className="border-t border-border-light" />
                  <button onClick={() => handleExport({ embedImagen: true, preview: true })} className="w-full text-left px-4 py-2.5 text-sm text-primary hover:bg-surface-hover transition-colors cursor-pointer">
                    <div className="font-medium">Preview (RGB)</div>
                    <div className="text-xs text-muted">Spots en color para verificar</div>
                  </button>
                </div>
              )}
            </div>
          )}

          {errorMsg && (
            <div className="text-[11px] text-accent truncate mt-1" title={errorMsg}>{errorMsg}</div>
          )}
        </div>
      )}

    </header>
  )
}
