import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FolderOpen, Plus, Trash2, Sun, Moon, Clock3, ImageIcon, ArrowRight } from 'lucide-react'
import { useStore } from '../store'
import {
  deleteProjectProfile,
  getCurrentProfileOwner,
  listProjectProfiles,
} from '../projectProfiles'

export function ProjectsMenu() {
  const navigate = useNavigate()
  const { resetEditor, cargarProyectoGuardado } = useStore()
  const [theme, setTheme] = useState(() => localStorage.getItem('xprin-theme') || 'light')
  const [ownerId, setOwnerId] = useState('local-user')
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [projectToDelete, setProjectToDelete] = useState(null)
  const [openingProject, setOpeningProject] = useState(null)
  const [openingProgress, setOpeningProgress] = useState(0)
  const recentProject = useMemo(() => projects[0] ?? null, [projects])

  useEffect(() => {
    async function loadProjects() {
      const owner = await getCurrentProfileOwner()
      const list = await listProjectProfiles(owner)
      setOwnerId(owner)
      setProjects(list)
      setLoading(false)
    }
    loadProjects()
  }, [])

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
    localStorage.setItem('xprin-theme', theme)
  }, [theme])

  async function handleCreateBlank() {
    let timer = null
    try {
      setOpeningProject('Preparando editor...')
      setOpeningProgress(4)
      const minLoadingMs = 2200
      const startedAt = Date.now()
      timer = setInterval(() => {
        const elapsed = Date.now() - startedAt
        const p = Math.min(92, 4 + Math.round((elapsed / minLoadingMs) * 88))
        setOpeningProgress(p)
      }, 70)
      await resetEditor()
      const elapsed = Date.now() - startedAt
      if (elapsed < minLoadingMs) {
        await new Promise((resolve) => setTimeout(resolve, minLoadingMs - elapsed))
      }
      clearInterval(timer)
      setOpeningProgress(100)
      await new Promise((resolve) => setTimeout(resolve, 220))
      navigate('/editor')
    } catch {
      setOpeningProject(null)
      setOpeningProgress(0)
    } finally {
      if (timer) clearInterval(timer)
    }
  }

  async function handleOpen(project) {
    let timer = null
    try {
      setOpeningProject(`Abriendo "${project.name}"...`)
      setOpeningProgress(4)
      const minLoadingMs = 2200
      const startedAt = Date.now()
      timer = setInterval(() => {
        const elapsed = Date.now() - startedAt
        const p = Math.min(92, 4 + Math.round((elapsed / minLoadingMs) * 88))
        setOpeningProgress(p)
      }, 70)
      await cargarProyectoGuardado(project)
      const elapsed = Date.now() - startedAt
      if (elapsed < minLoadingMs) {
        await new Promise((resolve) => setTimeout(resolve, minLoadingMs - elapsed))
      }
      clearInterval(timer)
      setOpeningProgress(100)
      await new Promise((resolve) => setTimeout(resolve, 220))
      navigate('/editor')
    } catch {
      setOpeningProject(null)
      setOpeningProgress(0)
    } finally {
      if (timer) clearInterval(timer)
    }
  }

  async function handleDelete(projectId) {
    await deleteProjectProfile({ ownerId, projectId })
    const list = await listProjectProfiles(ownerId)
    setProjects(list)
  }

  return (
    <main className="min-h-screen bg-base text-primary px-2 py-4 sm:px-4 sm:py-6 md:px-8 md:py-8">
      <div className="mx-auto w-full max-w-none sm:max-w-6xl">
        <div className="mb-4 rounded-xl border border-red-500/25 bg-gradient-to-r from-red-600/10 via-surface to-red-500/5 px-3 py-3 shadow-sm sm:mb-6 sm:rounded-2xl sm:px-4 sm:py-4 md:px-6 md:py-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[10px] uppercase tracking-[0.14em] text-muted sm:text-xs sm:tracking-[0.16em]">XPRIN Picasso</p>
              <h1 className="text-xl font-outfit font-semibold sm:text-2xl md:text-3xl">Mis proyectos</h1>
            </div>
            <button
              onClick={() => setTheme((t) => (t === 'light' ? 'dark' : 'light'))}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-red-500/35 bg-red-600 text-white hover:bg-red-500 transition-colors cursor-pointer sm:h-10 sm:w-10"
              title={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
            >
              {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            </button>
          </div>
        </div>

        <section className="mb-4 grid gap-2.5 md:mb-5 md:gap-3 md:grid-cols-[1.05fr_1fr]">
          <article className="rounded-2xl border border-red-500/30 bg-surface overflow-hidden">
            <div className="h-1.5 w-full bg-gradient-to-r from-red-700 via-red-500 to-red-400" />
            <div className="p-4 sm:p-5 md:p-6">
              <p className="text-xs sm:text-sm text-secondary">Empieza un diseño nuevo</p>
              <h2 className="mt-1 text-lg sm:text-xl font-semibold font-outfit">Crear pagina en blanco</h2>
              <p className="mt-2 text-xs sm:text-sm text-muted">Abre el editor limpio y empieza desde cero.</p>
              <button
                onClick={handleCreateBlank}
                className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-red-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-red-500 transition-colors cursor-pointer sm:mt-5 sm:w-auto sm:px-4 sm:py-2.5 sm:text-sm"
              >
                <Plus size={16} />
                Nuevo proyecto
              </button>
            </div>
          </article>

          <article className="rounded-2xl border border-red-500/30 bg-surface p-4 sm:p-5 md:p-6">
            <p className="text-xs sm:text-sm text-secondary">Ultimo guardado</p>
            {recentProject ? (
              <button
                onClick={() => handleOpen(recentProject)}
                className="mt-3 w-full rounded-xl border border-red-400/25 bg-surface-elevated p-3 text-left hover:border-red-500/45 hover:bg-surface-hover transition-colors cursor-pointer"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="truncate text-xs sm:text-sm font-semibold">{recentProject.name}</h3>
                    <p className="mt-1 inline-flex items-center gap-1.5 text-[11px] sm:text-xs text-muted">
                      <Clock3 size={12} />
                      {new Date(recentProject.updatedAt).toLocaleString()}
                    </p>
                  </div>
                  <ArrowRight size={15} className="text-secondary shrink-0" />
                </div>
              </button>
            ) : (
              <p className="mt-3 text-sm text-muted">Todavia no hay proyectos guardados.</p>
            )}
          </article>
        </section>

        <section className="rounded-2xl border border-red-500/25 bg-surface p-3 sm:p-4 md:p-5">
          <div className="mb-3 flex items-center gap-2 text-xs sm:text-sm text-secondary">
            <FolderOpen size={16} />
            Mis imagenes guardadas
          </div>

          {loading ? (
            <p className="text-sm text-muted">Cargando...</p>
          ) : projects.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border-light bg-surface-elevated p-6 text-center">
              <ImageIcon size={20} className="mx-auto mb-2 text-muted" />
              <p className="text-sm text-muted">Aun no tienes proyectos guardados.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-2.5 sm:gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {projects.map((project) => (
                <article
                  key={project.id}
                  className="group overflow-hidden rounded-xl border border-red-400/25 bg-surface-elevated transition-all duration-200 hover:border-red-500/45 hover:shadow-md"
                >
                  <button
                    onClick={() => handleOpen(project)}
                    className="block w-full text-left cursor-pointer"
                  >
                    <div className="aspect-[16/10] bg-canvas-board">
                      {project.snapshot?.imagenDataUrl ? (
                        <img
                          src={project.snapshot.imagenDataUrl}
                          alt={project.name}
                          className="h-full w-full object-contain"
                          draggable={false}
                        />
                      ) : null}
                    </div>
                    <div className="p-3">
                      <h2 className="truncate text-xs sm:text-sm font-semibold text-primary">{project.name}</h2>
                      <p className="mt-1 text-[11px] sm:text-xs text-muted">
                        {new Date(project.updatedAt).toLocaleString()}
                      </p>
                    </div>
                  </button>
                  <div className="border-t border-border-light p-2">
                    <button
                      onClick={() => setProjectToDelete(project)}
                      className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs text-secondary hover:text-red-500 hover:bg-surface transition-colors cursor-pointer"
                    >
                      <Trash2 size={13} />
                      Eliminar
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>

      <div
        className={`fixed inset-0 z-[120] grid place-items-center p-4 transition-all duration-300 ${
          projectToDelete ? 'pointer-events-auto bg-black/45 backdrop-blur-[2px] opacity-100' : 'pointer-events-none bg-black/0 opacity-0'
        }`}
      >
        <div
          className={`w-[360px] max-w-[92vw] rounded-xl border border-red-500/30 bg-surface p-5 shadow-2xl transition-all duration-300 ${
            projectToDelete ? 'translate-y-0 scale-100 rotate-0' : 'translate-y-3 scale-[0.96] -rotate-1'
          }`}
        >
          <h3 className="text-base font-semibold text-primary">Eliminar proyecto</h3>
          <p className="mt-2 text-sm text-secondary">
            {projectToDelete
              ? `¿Estas seguro de eliminar "${projectToDelete.name}"? Esta accion no se puede deshacer.`
              : ''}
          </p>
          <div className="mt-5 flex items-center justify-end gap-2">
            <button
              onClick={() => setProjectToDelete(null)}
              className="rounded-lg border border-border-light bg-surface-elevated px-3 py-2 text-sm font-medium text-secondary hover:text-primary hover:bg-surface-hover transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              onClick={async () => {
                if (!projectToDelete) return
                await handleDelete(projectToDelete.id)
                setProjectToDelete(null)
              }}
              className="rounded-lg bg-red-600 px-3 py-2 text-sm font-semibold text-white hover:bg-red-500 transition-colors cursor-pointer"
            >
              Eliminar
            </button>
          </div>
        </div>
      </div>

      <div
        className={`fixed inset-0 z-[130] grid place-items-center p-4 transition-all duration-300 ${
          openingProject ? 'pointer-events-auto bg-black/45 backdrop-blur-[2px] opacity-100' : 'pointer-events-none bg-black/0 opacity-0'
        }`}
      >
        <div
          className={`w-[340px] max-w-[92vw] rounded-xl border border-red-500/30 bg-surface p-5 text-center shadow-2xl transition-all duration-300 ${
            openingProject ? 'translate-y-0 scale-100' : 'translate-y-3 scale-[0.97]'
          }`}
        >
          <div className="mx-auto mb-3 h-10 w-10 rounded-full border-2 border-red-500/25 border-t-red-500 animate-spin" />
          <p className="text-base font-semibold text-primary">{openingProject || 'Cargando...'}</p>
          <p className="mt-1 text-sm text-secondary">Un momento, estamos preparando todo.</p>
          <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-surface-elevated">
            <div
              className="h-full rounded-full bg-red-500 transition-[width] duration-150 ease-out"
              style={{ width: `${openingProgress}%` }}
            />
          </div>
          <p className="mt-1 text-[11px] text-muted tabular-nums">{openingProgress}%</p>
        </div>
      </div>
    </main>
  )
}
