import { Link } from 'react-router-dom'
import { Bell, Palette, Shield, SlidersHorizontal } from 'lucide-react'

export function Configuracion() {
  function handleThemeChange(nextTheme) {
    localStorage.setItem('xprin-theme', nextTheme)
    document.documentElement.classList.toggle('dark', nextTheme === 'dark')
  }

  const currentTheme =
    localStorage.getItem('xprin-theme')
    || (document.documentElement.classList.contains('dark') ? 'dark' : 'light')

  return (
    <main className="min-h-screen bg-base px-3 py-5 text-primary sm:px-5 md:px-8">
      <div className="mx-auto w-full max-w-5xl">
        <section className="rounded-2xl border border-red-500/25 bg-gradient-to-r from-red-600/10 via-surface to-red-500/5 p-4 shadow-sm sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] uppercase tracking-[0.15em] text-muted">Preferencias</p>
              <h1 className="mt-1 text-2xl font-semibold font-outfit sm:text-3xl">Configuracion</h1>
              <p className="mt-2 text-sm text-secondary">
                Ajustes visuales y opciones generales del entorno de trabajo.
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

        <section className="mt-4 grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
          <article className="rounded-2xl border border-red-500/20 bg-surface p-5">
            <div className="flex items-center gap-2">
              <Palette size={18} className="text-red-500" />
              <h2 className="text-base font-semibold">Apariencia</h2>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => handleThemeChange('light')}
                className={`rounded-xl border p-4 text-left transition-colors ${
                  currentTheme === 'light'
                    ? 'border-red-500/45 bg-red-500/10'
                    : 'border-border-light bg-surface-elevated hover:bg-surface-hover'
                }`}
              >
                <p className="text-sm font-semibold">Modo claro</p>
                <p className="mt-1 text-xs text-secondary">Interfaz luminosa para revision y produccion.</p>
              </button>
              <button
                type="button"
                onClick={() => handleThemeChange('dark')}
                className={`rounded-xl border p-4 text-left transition-colors ${
                  currentTheme === 'dark'
                    ? 'border-red-500/45 bg-red-500/10'
                    : 'border-border-light bg-surface-elevated hover:bg-surface-hover'
                }`}
              >
                <p className="text-sm font-semibold">Modo oscuro</p>
                <p className="mt-1 text-xs text-secondary">Reduce brillo cuando trabajas durante mas tiempo.</p>
              </button>
            </div>
          </article>

          <aside className="space-y-4">
            <article className="rounded-2xl border border-red-500/20 bg-surface p-5">
              <div className="flex items-center gap-2">
                <Bell size={18} className="text-red-500" />
                <h2 className="text-base font-semibold">Notificaciones</h2>
              </div>
              <p className="mt-3 text-sm text-secondary">
                Por ahora las alertas del sistema estan integradas en la propia interfaz del editor.
              </p>
            </article>

            <article className="rounded-2xl border border-red-500/20 bg-surface p-5">
              <div className="flex items-center gap-2">
                <Shield size={18} className="text-red-500" />
                <h2 className="text-base font-semibold">Cuenta y seguridad</h2>
              </div>
              <p className="mt-3 text-sm text-secondary">
                La autenticacion y recuperacion de acceso se gestiona desde las pantallas de login y cambio de contrasena.
              </p>
            </article>

            <article className="rounded-2xl border border-red-500/20 bg-surface p-5">
              <div className="flex items-center gap-2">
                <SlidersHorizontal size={18} className="text-red-500" />
                <h2 className="text-base font-semibold">Estado</h2>
              </div>
              <p className="mt-3 text-sm text-secondary">
                Esta area ya esta preparada para que luego podais añadir ajustes mas avanzados sin rehacer la navegación.
              </p>
            </article>
          </aside>
        </section>
      </div>
    </main>
  )
}
