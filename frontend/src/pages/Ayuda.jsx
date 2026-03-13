import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { CircleHelp, FileDown, Mail, Search, Send, Upload } from 'lucide-react'
import { useAuthUser } from '../hooks/useAuthUser'
import { API_URL } from '../config'

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
  const { user } = useAuthUser()
  const [query, setQuery] = useState('')
  const [topic, setTopic] = useState('soporte')
  const [senderEmail, setSenderEmail] = useState('')
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [sendStatus, setSendStatus] = useState({ type: '', message: '' })
  const supportEmail = import.meta.env.VITE_SUPPORT_EMAIL || ''

  useEffect(() => {
    if (user?.email) setSenderEmail(user.email)
  }, [user])

  const filteredFaq = useMemo(() => {
    const term = query.trim().toLowerCase()
    if (!term) return FAQ_ITEMS
    return FAQ_ITEMS.filter((item) =>
      item.q.toLowerCase().includes(term) || item.a.toLowerCase().includes(term),
    )
  }, [query])

  function openMailClient() {
    if (!supportEmail) {
      setSendStatus({
        type: 'error',
        message: 'Falta configurar VITE_SUPPORT_EMAIL en frontend/.env para usar el envio por correo.',
      })
      return
    }

    const subject = `[XPRIN] ${topic}`
    const body = [
      `Remitente: ${senderEmail.trim() || 'No indicado'}`,
      '',
      message.trim() || 'Sin mensaje.',
    ].join('\n')

    window.location.href = `mailto:${supportEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
    setSendStatus({
      type: 'success',
      message: 'Se ha abierto tu cliente de correo con el mensaje preparado.',
    })
  }

  function handleSupportSubmit(event) {
    event.preventDefault()
    setSendStatus({ type: '', message: '' })

    if (!senderEmail.trim() || !message.trim()) {
      setSendStatus({ type: 'error', message: 'Completa tu correo y el mensaje antes de enviar.' })
      return
    }

    setSending(true)

    fetch(`${API_URL}/contact-support`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        topic,
        sender_email: senderEmail.trim(),
        sender_name:
          user?.user_metadata?.full_name
          || user?.user_metadata?.name
          || '',
        message: message.trim(),
      }),
    })
      .then(async (response) => {
        const data = await response.json().catch(() => ({}))
        if (!response.ok) {
          if (response.status === 503) {
            openMailClient()
            return
          }
          throw new Error(data.detail || 'No se pudo enviar el mensaje.')
        }
        setMessage('')
        setSendStatus({ type: 'success', message: 'Mensaje enviado correctamente al equipo.' })
      })
      .catch((error) => {
        setSendStatus({ type: 'error', message: error.message || 'No se pudo enviar el mensaje.' })
      })
      .finally(() => {
        setSending(false)
      })
  }

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

        <section className="mt-4 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <article className="rounded-2xl border border-red-500/20 bg-surface p-4 sm:p-5">
            <div className="flex items-center gap-2">
              <Send size={16} className="text-red-500" />
              <h2 className="text-base font-semibold">Enviar mensaje</h2>
            </div>
            <p className="mt-2 text-sm text-secondary">
              Envia tu mensaje al equipo desde esta misma pantalla. Si el backend no tiene SMTP, se abrira tu cliente de correo como respaldo.
            </p>

            <form className="mt-4 space-y-3" onSubmit={handleSupportSubmit}>
              {sendStatus.message ? (
                <div
                  className={`rounded-xl border px-3 py-2 text-sm ${
                    sendStatus.type === 'success'
                      ? 'border-green-500/30 bg-green-500/10 text-green-700 dark:text-green-300'
                      : 'border-red-500/30 bg-red-500/10 text-red-600'
                  }`}
                >
                  {sendStatus.message}
                </div>
              ) : null}

              <div>
                <label className="mb-1.5 block text-xs font-medium uppercase tracking-[0.12em] text-muted">
                  Motivo
                </label>
                <select
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  className="w-full rounded-xl border border-border-light bg-surface-elevated px-3 py-2.5 text-sm text-primary outline-none transition-colors focus:border-red-500/45"
                >
                  <option value="soporte">Soporte tecnico</option>
                  <option value="facturacion">Facturacion</option>
                  <option value="mejora">Sugerencia o mejora</option>
                  <option value="otro">Otro asunto</option>
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium uppercase tracking-[0.12em] text-muted">
                  Tu correo
                </label>
                <input
                  type="email"
                  value={senderEmail}
                  onChange={(e) => setSenderEmail(e.target.value)}
                  placeholder="tuemail@empresa.com"
                  className="w-full rounded-xl border border-border-light bg-surface-elevated px-3 py-2.5 text-sm text-primary outline-none transition-colors focus:border-red-500/45"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium uppercase tracking-[0.12em] text-muted">
                  Mensaje
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Describe el problema o la necesidad que tienes."
                  rows={6}
                  className="w-full rounded-xl border border-border-light bg-surface-elevated px-3 py-2.5 text-sm text-primary outline-none transition-colors focus:border-red-500/45"
                />
              </div>

              <button
                type="submit"
                disabled={sending}
                className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-500 transition-colors disabled:opacity-60"
              >
                <Send size={15} />
                {sending ? 'Enviando...' : 'Enviar mensaje'}
              </button>
            </form>
          </article>

          <aside className="rounded-2xl border border-red-500/20 bg-surface p-4 sm:p-5">
            <div className="flex items-center gap-2">
              <Mail size={16} className="text-red-500" />
              <h2 className="text-base font-semibold">Destino actual</h2>
            </div>

            <div className="mt-4 rounded-xl border border-border-light bg-surface-elevated p-4">
              <p className="text-xs uppercase tracking-[0.12em] text-muted">Backend de soporte</p>
              <p className="mt-2 text-sm font-medium text-primary">POST {API_URL}/contact-support</p>
              <p className="mt-3 text-xs text-secondary">
                El destinatario real se configura en el backend con `SUPPORT_EMAIL` y las variables SMTP.
              </p>
            </div>

            <div className="mt-3 rounded-xl border border-border-light bg-surface-elevated p-4">
              <p className="text-xs uppercase tracking-[0.12em] text-muted">Fallback frontend</p>
              <p className="mt-2 break-all text-sm font-medium text-primary">
                {supportEmail || 'Sin VITE_SUPPORT_EMAIL configurado'}
              </p>
              <p className="mt-3 text-xs text-secondary">
                Si no hay SMTP en la API, la pagina intentara usar este correo con `mailto:`.
              </p>
            </div>

            <p className="mt-4 text-sm text-secondary">
              Con solo definir `VITE_SUPPORT_EMAIL` en el frontend ya podeis usar el formulario aunque la API no tenga correo saliente.
            </p>
          </aside>
        </section>
      </div>
    </main>
  )
}
