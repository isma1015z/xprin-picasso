import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { CircleHelp, FileDown, Search, Upload } from 'lucide-react'

const FAQ_ITEMS = [
  {
    q: '¿Como subo una imagen al editor?',
    a: 'En el editor pulsa "Subir imagen", elige un PNG/JPG/WebP y espera a que termine la deteccion de capas.',
  },
  {
    q: '¿Como guardo mi proyecto?',
    a: 'Puedes cerrarlo con "Cerrar" y guardar en "Mis proyectos". Tambien se guarda por usuario para abrirlo despues.',
  },
  {
    q: '¿Como exporto el PDF final?',
    a: 'Asigna al menos un spot a una capa y pulsa "Exportar PDF". Puedes usar opciones de preview o sin imagen.',
  },
  {
    q: 'No puedo entrar al editor, ¿que hago?',
    a: 'Asegurate de haber iniciado sesion. Si la sesion caduca, vuelve a /login y entra de nuevo.',
  },
]

export function Ayuda() {
  const [query, setQuery] = useState('')

  const filteredFaq = useMemo(() => {
    const term = query.trim().toLowerCase()
    if (!term) return FAQ_ITEMS
    return FAQ_ITEMS.filter((item) =>
      item.q.toLowerCase().includes(term) || item.a.toLowerCase().includes(term),
    )
  }, [query])

  return (
    <main className="min-h-screen bg-base px-3 py-5 text-primary sm:px-5 md:px-8">
      <div className="mx-auto w-full max-w-5xl">
        <section className="rounded-2xl border border-red-500/25 bg-gradient-to-r from-red-600/10 via-surface to-red-500/5 p-4 shadow-sm sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] uppercase tracking-[0.15em] text-muted">Centro de ayuda</p>
              <h1 className="mt-1 text-2xl font-semibold font-outfit sm:text-3xl">Ayuda XPRIN Picasso</h1>
              <p className="mt-2 text-sm text-secondary">
                Guias rapidas para subir imagenes, guardar proyectos y exportar correctamente.
              </p>
            </div>
            <Link
              to="/proyectos"
              className="rounded-lg border border-border-light bg-surface-elevated px-3 py-2 text-xs font-medium text-secondary hover:bg-surface-hover hover:text-primary transition-colors"
            >
              Volver
            </Link>
          </div>
        </section>

        <section className="mt-4 rounded-2xl border border-red-500/20 bg-surface p-4 sm:p-5">
          <label className="mb-2 inline-flex items-center gap-2 text-xs uppercase tracking-[0.12em] text-muted">
            <Search size={14} />
            Buscar en ayuda
          </label>
          <div className="relative">
            <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ejemplo: exportar PDF"
              className="w-full rounded-xl border border-border-light bg-surface-elevated py-2.5 pl-9 pr-3 text-sm text-primary outline-none transition-colors focus:border-red-500/45"
            />
          </div>
        </section>

        <section className="mt-4 grid gap-3 sm:grid-cols-3">
          <article className="rounded-xl border border-red-500/20 bg-surface p-4">
            <Upload size={16} className="text-red-500" />
            <h2 className="mt-2 text-sm font-semibold">Subida y deteccion</h2>
            <p className="mt-1 text-xs text-muted">Importa imagenes y revisa capas detectadas.</p>
          </article>
          <article className="rounded-xl border border-red-500/20 bg-surface p-4">
            <FileDown size={16} className="text-red-500" />
            <h2 className="mt-2 text-sm font-semibold">Exportacion PDF</h2>
            <p className="mt-1 text-xs text-muted">Opciones con imagen, sin imagen y preview.</p>
          </article>
          <article className="rounded-xl border border-red-500/20 bg-surface p-4">
            <CircleHelp size={16} className="text-red-500" />
            <h2 className="mt-2 text-sm font-semibold">Soporte</h2>
            <p className="mt-1 text-xs text-muted">Si algo falla, contacta al equipo tecnico.</p>
          </article>
        </section>

        <section className="mt-4 rounded-2xl border border-red-500/20 bg-surface p-4 sm:p-5">
          <h2 className="text-base font-semibold">Preguntas frecuentes</h2>
          <div className="mt-3 space-y-2.5">
            {filteredFaq.length === 0 ? (
              <p className="rounded-lg border border-dashed border-border-light bg-surface-elevated p-4 text-sm text-muted">
                No hay resultados para "{query}".
              </p>
            ) : (
              filteredFaq.map((item) => (
                <article key={item.q} className="rounded-lg border border-border-light bg-surface-elevated p-3">
                  <h3 className="text-sm font-semibold">{item.q}</h3>
                  <p className="mt-1 text-sm text-secondary">{item.a}</p>
                </article>
              ))
            )}
          </div>
        </section>

        <section className="mt-4 rounded-2xl border border-red-500/20 bg-surface p-4 sm:p-5">
          <h2 className="text-base font-semibold">Contacto</h2>
          <p className="mt-2 text-sm text-secondary">
            Si necesitas soporte directo, escribe a <a href="mailto:soporte@xprin.com" className="text-red-500 hover:underline">soporte@xprin.com</a>.
          </p>
        </section>
      </div>
    </main>
  )
}
