import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, FolderOpen, Trash2 } from 'lucide-react'
import { useStore } from '../store'
import { listSavedProjects, deleteProject } from '../savedProjects'

function fmtDate(ts) {
  try {
    return new Date(ts).toLocaleString()
  } catch {
    return ''
  }
}

export function EditorMenu() {
  const navigate = useNavigate()
  const { resetEditor, cargarProyectoGuardado } = useStore()
  const [saved, setSaved] = useState(() => listSavedProjects())

  const sorted = useMemo(
    () => [...saved].sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0)),
    [saved]
  )

  function handleNewBlank() {
    resetEditor()
    navigate('/editor')
  }

  function handleOpen(item) {
    if (!item?.payload) return
    cargarProyectoGuardado(item.payload)
    navigate('/editor')
  }

  function handleDelete(id) {
    setSaved(deleteProject(id))
  }

  return (
    <main className="min-h-screen bg-base text-primary">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
        <h1 className="text-2xl sm:text-3xl font-semibold mb-6">Proyectos</h1>

        <button
          onClick={handleNewBlank}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-3 rounded-lg
            bg-accent text-white hover:bg-accent-hover transition-colors text-sm font-medium"
        >
          <Plus size={16} />
          Crear una página en blanco
        </button>

        <section className="mt-8">
          <h2 className="text-lg font-medium mb-3">Mis imágenes</h2>

          {sorted.length === 0 ? (
            <p className="text-sm text-muted">Aún no tienes proyectos guardados.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {sorted.map((item) => (
                <article key={item.id} className="border border-border-strong rounded-xl overflow-hidden bg-surface">
                  <div className="h-36 bg-surface-elevated">
                    {item.thumbnail ? (
                      <img src={item.thumbnail} alt={item.nombre} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted text-sm">Sin vista previa</div>
                    )}
                  </div>

                  <div className="p-3">
                    <p className="text-sm font-medium truncate" title={item.nombre}>{item.nombre}</p>
                    <p className="text-xs text-muted mt-1">{fmtDate(item.updatedAt)}</p>

                    <div className="mt-3 flex items-center gap-2">
                      <button
                        onClick={() => handleOpen(item)}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-md
                          bg-surface-elevated border border-border-light text-sm hover:bg-surface-hover transition-colors"
                      >
                        <FolderOpen size={14} />
                        Abrir
                      </button>
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="inline-flex items-center justify-center px-3 py-2 rounded-md
                          border border-border-light text-muted hover:text-accent hover:border-accent/40 transition-colors"
                        title="Eliminar"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  )
}

