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
  {
    q: '¿Como asigno spots a las capas?',
    a: 'En el panel lateral, selecciona una capa y haz clic en los puntos de color detectados para asignar spots.',
  },
  {
    q: '¿Puedo cambiar el nombre del PDF?',
    a: 'Si, en el header del editor hay un campo editable para renombrar el archivo PDF antes de exportar.',
  },
  {
    q: '¿Que formatos de imagen soporta?',
    a: 'PNG, JPG y WebP. Asegúrate de que la imagen tenga zonas de color bien definidas para mejor detección.',
  },
  {
    q: '¿Como cambio el tema oscuro/claro?',
    a: 'En el menú de perfil (avatar), selecciona "Cambiar fondo" para alternar entre modo oscuro y claro.',
  },
  {
    q: '¿Puedo editar mi perfil?',
    a: 'Si, ve a "Mi cuenta" desde el menú de perfil para cambiar nombre, imagen de perfil y contraseña.',
  },
  {
    q: '¿Que es un spot en el diseño?',
    a: 'Un spot es un punto de color específico en la capa. Asigna spots para definir áreas de impresión en el PDF.',
  },
  {
    q: '¿Como veo una preview del PDF?',
    a: 'Al exportar, elige la opción "Preview" para ver el PDF sin descargar, o exporta con imagen para ver el resultado final.',
  },
  {
    q: '¿Puedo trabajar sin imagen?',
    a: 'Si, crea un proyecto en blanco y diseña desde cero, pero para detección automática necesitas subir una imagen.',
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
    <main className="min-h-screen bg-gradient-to-br from-base via-surface to-base px-4 py-6 text-primary sm:px-6 md:px-8">
      <div className="mx-auto w-full max-w-6xl">
        {/* Header Hero */}
        <section className="relative overflow-hidden rounded-3xl border border-red-500/20 bg-gradient-to-r from-red-600/10 via-surface to-red-500/5 p-6 shadow-2xl sm:p-8 md:p-10">
          <div className="relative z-10">
            <div className="flex flex-col items-center text-center gap-4 sm:flex-row sm:items-start sm:justify-between sm:text-left">
              <div className="flex-1">
                <p className="text-xs uppercase tracking-[0.2em] text-red-500 font-semibold">Centro de Ayuda</p>
                <h1 className="mt-2 text-3xl font-bold font-outfit sm:text-4xl md:text-5xl">Ayuda XPRIN Picasso</h1>
                <p className="mt-3 text-base text-secondary max-w-2xl">
                  Domina el diseño de impresión con guías paso a paso, tips profesionales y soporte experto para crear PDFs perfectos.
                </p>
                <div className="mt-6 flex flex-wrap gap-3">
                  <Link
                    to="/proyectos"
                    className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-5 py-3 text-sm font-semibold text-white hover:bg-red-500 transition-all duration-200 shadow-lg hover:shadow-xl"
                  >
                    <Upload size={16} />
                    Empezar a diseñar
                  </Link>
                  <button
                    onClick={() => document.getElementById('faq-section')?.scrollIntoView({ behavior: 'smooth' })}
                    className="inline-flex items-center gap-2 rounded-xl border border-red-500/30 bg-surface px-5 py-3 text-sm font-semibold text-red-600 hover:bg-red-500/10 transition-all duration-200"
                  >
                    <CircleHelp size={16} />
                    Ver FAQs
                  </button>
                </div>
              </div>
              <div className="mt-6 sm:mt-0">
                <div className="relative">
                  <div className="absolute inset-0 rounded-2xl bg-red-500/20 blur-xl"></div>
                  <div className="relative rounded-2xl bg-gradient-to-br from-red-500/20 to-red-600/20 p-6">
                    <FileDown size={48} className="text-red-500" />
                  </div>
                </div>
              </div>
            </div>
          </div>
          {/* Decorative elements */}
          <div className="absolute top-4 right-4 w-20 h-20 bg-red-500/10 rounded-full blur-2xl"></div>
          <div className="absolute bottom-4 left-4 w-16 h-16 bg-red-600/10 rounded-full blur-xl"></div>
        </section>

        {/* Quick Actions */}
        <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <article className="group rounded-2xl border border-red-500/20 bg-surface p-5 hover:border-red-500/40 hover:shadow-lg transition-all duration-300 cursor-pointer">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-red-500/10 p-3 group-hover:bg-red-500/20 transition-colors">
                <Upload size={24} className="text-red-500" />
              </div>
              <div>
                <h3 className="font-semibold text-sm">Subida de imagen</h3>
                <p className="text-xs text-muted">Importa y detecta capas</p>
              </div>
            </div>
          </article>
          <article className="group rounded-2xl border border-red-500/20 bg-surface p-5 hover:border-red-500/40 hover:shadow-lg transition-all duration-300 cursor-pointer">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-red-500/10 p-3 group-hover:bg-red-500/20 transition-colors">
                <FileDown size={24} className="text-red-500" />
              </div>
              <div>
                <h3 className="font-semibold text-sm">Exportar PDF</h3>
                <p className="text-xs text-muted">Opciones avanzadas</p>
              </div>
            </div>
          </article>
          <article className="group rounded-2xl border border-red-500/20 bg-surface p-5 hover:border-red-500/40 hover:shadow-lg transition-all duration-300 cursor-pointer">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-red-500/10 p-3 group-hover:bg-red-500/20 transition-colors">
                <CircleHelp size={24} className="text-red-500" />
              </div>
              <div>
                <h3 className="font-semibold text-sm">Soporte técnico</h3>
                <p className="text-xs text-muted">Ayuda especializada</p>
              </div>
            </div>
          </article>
          <article className="group rounded-2xl border border-red-500/20 bg-surface p-5 hover:border-red-500/40 hover:shadow-lg transition-all duration-300 cursor-pointer">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-red-500/10 p-3 group-hover:bg-red-500/20 transition-colors">
                <Search size={24} className="text-red-500" />
              </div>
              <div>
                <h3 className="font-semibold text-sm">Buscar ayuda</h3>
                <p className="text-xs text-muted">Encuentra respuestas</p>
              </div>
            </div>
          </article>
        </section>

        {/* Search */}
        <section className="mt-8 rounded-2xl border border-red-500/20 bg-surface p-6">
          <div className="flex items-center gap-3 mb-4">
            <Search size={20} className="text-red-500" />
            <h2 className="text-lg font-semibold">Buscar en la ayuda</h2>
          </div>
          <div className="relative">
            <Search size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ej: cómo asignar spots, exportar PDF..."
              className="w-full rounded-xl border border-border-light bg-surface-elevated py-3 pl-12 pr-4 text-base outline-none transition-all focus:border-red-500/50 focus:ring-2 focus:ring-red-500/20"
            />
          </div>
        </section>

        {/* Design Guide */}
        <section className="mt-8 rounded-2xl border border-red-500/20 bg-surface p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="rounded-xl bg-red-500/10 p-2">
              <FileDown size={24} className="text-red-500" />
            </div>
            <div>
              <h2 className="text-xl font-semibold">Guía de diseño paso a paso</h2>
              <p className="text-sm text-secondary">Aprende a crear diseños profesionales en minutos</p>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-4">
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-red-500 text-white flex items-center justify-center font-bold text-sm">1</div>
                <div>
                  <h3 className="font-semibold">Prepara tu imagen</h3>
                  <p className="text-sm text-secondary mt-1">Sube una imagen de alta calidad con colores bien definidos. Evita fondos complejos para una detección óptima.</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-red-500 text-white flex items-center justify-center font-bold text-sm">2</div>
                <div>
                  <h3 className="font-semibold">Revisa las capas detectadas</h3>
                  <p className="text-sm text-secondary mt-1">El sistema identifica automáticamente las zonas de color. Ajusta si es necesario en el panel lateral.</p>
                </div>
              </div>
            </div>
            <div className="space-y-4">
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-red-500 text-white flex items-center justify-center font-bold text-sm">3</div>
                <div>
                  <h3 className="font-semibold">Asigna spots a capas</h3>
                  <p className="text-sm text-secondary mt-1">Haz clic en los puntos de color para activar las áreas de impresión en cada capa.</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-red-500 text-white flex items-center justify-center font-bold text-sm">4</div>
                <div>
                  <h3 className="font-semibold">Exporta tu PDF</h3>
                  <p className="text-sm text-secondary mt-1">Elige entre preview, con imagen o sin imagen. Tu diseño está listo para impresión profesional.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq-section" className="mt-8 rounded-2xl border border-red-500/20 bg-surface p-6">
          <div className="flex items-center gap-3 mb-6">
            <CircleHelp size={24} className="text-red-500" />
            <h2 className="text-xl font-semibold">Preguntas frecuentes</h2>
          </div>
          <div className="space-y-3">
            {filteredFaq.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border-light bg-surface-elevated p-6 text-center">
                <Search size={32} className="mx-auto text-muted mb-2" />
                <p className="text-muted">No hay resultados para "{query}".</p>
              </div>
            ) : (
              filteredFaq.map((item, index) => (
                <article key={item.q} className="rounded-xl border border-border-light bg-surface-elevated p-4 hover:border-red-500/30 transition-colors">
                  <div className="flex gap-3">
                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-red-500/10 flex items-center justify-center mt-0.5">
                      <span className="text-xs font-bold text-red-500">{index + 1}</span>
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-sm">{item.q}</h3>
                      <p className="text-sm text-secondary mt-1">{item.a}</p>
                    </div>
                  </div>
                </article>
              ))
            )}
          </div>
        </section>

        {/* Support */}
        <section className="mt-8 grid gap-6 lg:grid-cols-2">
          <article className="rounded-2xl border border-red-500/20 bg-surface p-6">
            <div className="flex items-center gap-3 mb-4">
              <Mail size={24} className="text-red-500" />
              <h2 className="text-xl font-semibold">Contactar soporte</h2>
            </div>
            <p className="text-secondary mb-4">
              ¿Necesitas ayuda personalizada? Envía tu consulta al equipo técnico. Responderemos lo antes posible.
            </p>
            <form className="space-y-4" onSubmit={handleSupportSubmit}>
              <div>
                <label className="block text-sm font-medium mb-2">Tipo de consulta</label>
                <select
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  className="w-full rounded-lg border border-border-light bg-surface-elevated px-3 py-2 text-sm focus:border-red-500 focus:outline-none"
                >
                  <option value="soporte">Soporte técnico</option>
                  <option value="diseno">Ayuda con diseño</option>
                  <option value="cuenta">Problemas de cuenta</option>
                  <option value="otro">Otro</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Tu email</label>
                <input
                  type="email"
                  value={senderEmail}
                  onChange={(e) => setSenderEmail(e.target.value)}
                  className="w-full rounded-lg border border-border-light bg-surface-elevated px-3 py-2 text-sm focus:border-red-500 focus:outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Mensaje</label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={4}
                  className="w-full rounded-lg border border-border-light bg-surface-elevated px-3 py-2 text-sm focus:border-red-500 focus:outline-none resize-none"
                  placeholder="Describe tu problema o consulta..."
                  required
                />
              </div>
              {sendStatus.message && (
                <div className={`p-3 rounded-lg text-sm ${sendStatus.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                  {sendStatus.message}
                </div>
              )}
              <button
                type="submit"
                disabled={sending}
                className="w-full rounded-lg bg-red-600 px-4 py-3 text-sm font-semibold text-white hover:bg-red-500 disabled:opacity-50 transition-colors"
              >
                {sending ? 'Enviando...' : 'Enviar mensaje'}
              </button>
            </form>
          </article>

          <article className="rounded-2xl border border-red-500/20 bg-surface p-6">
            <div className="flex items-center gap-3 mb-4">
              <Send size={24} className="text-red-500" />
              <h2 className="text-xl font-semibold">Recursos adicionales</h2>
            </div>
            <div className="space-y-4">
              <div className="flex items-start gap-3 p-3 rounded-lg bg-surface-elevated">
                <div className="rounded-lg bg-red-500/10 p-2 mt-0.5">
                  <FileDown size={16} className="text-red-500" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm">Documentación completa</h3>
                  <p className="text-xs text-secondary mt-1">Guías avanzadas y API reference</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 rounded-lg bg-surface-elevated">
                <div className="rounded-lg bg-red-500/10 p-2 mt-0.5">
                  <CircleHelp size={16} className="text-red-500" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm">Tutoriales en video</h3>
                  <p className="text-xs text-secondary mt-1">Videos paso a paso próximamente</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 rounded-lg bg-surface-elevated">
                <div className="rounded-lg bg-red-500/10 p-2 mt-0.5">
                  <Mail size={16} className="text-red-500" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm">Newsletter</h3>
                  <p className="text-xs text-secondary mt-1">Actualizaciones y tips de diseño</p>
                </div>
              </div>
            </div>
          </article>
        </section>
      </div>
    </main>
  )
}
