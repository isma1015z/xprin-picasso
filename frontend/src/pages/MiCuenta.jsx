import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ImagePlus, KeyRound, Mail, Save, ShieldCheck, UserRound } from 'lucide-react'
import { useAuthUser } from '../hooks/useAuthUser'
import { supabase } from '../lib/supabase'

const AVATARS_BUCKET = import.meta.env.VITE_SUPABASE_AVATARS_BUCKET || 'avatars'

function getAvatarUrl(user) {
  return (
    user?.user_metadata?.avatar_url
    || user?.user_metadata?.picture
    || user?.identities?.[0]?.identity_data?.avatar_url
    || null
  )
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = () => reject(new Error('No se pudo leer la imagen seleccionada.'))
    reader.readAsDataURL(file)
  })
}

function getStoragePathFromUrl(url) {
  if (!url || !url.includes('/storage/v1/object/public/')) return null
  const marker = `/storage/v1/object/public/${AVATARS_BUCKET}/`
  const index = url.indexOf(marker)
  if (index < 0) return null
  return url.slice(index + marker.length)
}

export function MiCuenta() {
  const fileInputRef = useRef(null)
  const { user, refreshUser } = useAuthUser()

  const email = user?.email || ''
  const initialName =
    user?.user_metadata?.full_name
    || user?.user_metadata?.name
    || email.split('@')[0]
    || 'Usuario'
  const initialAvatar = getAvatarUrl(user)

  const [fullName, setFullName] = useState(initialName)
  const [newEmail, setNewEmail] = useState(email)
  const [avatarUrl, setAvatarUrl] = useState(initialAvatar)
  const [avatarFile, setAvatarFile] = useState(null)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [repeatPassword, setRepeatPassword] = useState('')
  const [profileStatus, setProfileStatus] = useState({ type: '', message: '' })
  const [emailStatus, setEmailStatus] = useState({ type: '', message: '' })
  const [passwordStatus, setPasswordStatus] = useState({ type: '', message: '' })
  const [savingProfile, setSavingProfile] = useState(false)
  const [savingEmail, setSavingEmail] = useState(false)
  const [savingPassword, setSavingPassword] = useState(false)

  useEffect(() => {
    setFullName(initialName)
    setNewEmail(email)
    setAvatarUrl(initialAvatar)
    setAvatarFile(null)
  }, [initialName, email, initialAvatar])

  async function handleAvatarChange(event) {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      if (!file.type.startsWith('image/')) {
        throw new Error('Selecciona una imagen valida.')
      }
      const dataUrl = await readFileAsDataUrl(file)
      setAvatarUrl(dataUrl)
      setAvatarFile(file)
      setProfileStatus({ type: '', message: '' })
    } catch (error) {
      setProfileStatus({ type: 'error', message: error.message || 'No se pudo cargar la imagen.' })
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  async function handleProfileSave(event) {
    event.preventDefault()
    setSavingProfile(true)
    setProfileStatus({ type: '', message: '' })

    try {
      let nextAvatarUrl = avatarUrl || null

      if (avatarFile && user?.id) {
        const fileExt = (avatarFile.name.split('.').pop() || 'png').toLowerCase()
        const filePath = `${user.id}/${Date.now()}-${crypto.randomUUID()}.${fileExt}`
        const previousPath = getStoragePathFromUrl(initialAvatar)

        const { error: uploadError } = await supabase.storage
          .from(AVATARS_BUCKET)
          .upload(filePath, avatarFile, {
            upsert: true,
            contentType: avatarFile.type || 'image/png',
          })

        if (uploadError) {
          throw new Error(`No se pudo subir la imagen a Supabase Storage: ${uploadError.message}`)
        }

        const { data: publicData } = supabase.storage
          .from(AVATARS_BUCKET)
          .getPublicUrl(filePath)

        nextAvatarUrl = publicData?.publicUrl || null

        if (previousPath) {
          await supabase.storage.from(AVATARS_BUCKET).remove([previousPath])
        }
      }

      const { error } = await supabase.auth.updateUser({
        data: {
          full_name: fullName.trim(),
          avatar_url: nextAvatarUrl,
        },
      })
      if (error) throw error
      await refreshUser()
      setAvatarFile(null)
      setProfileStatus({ type: 'success', message: 'Perfil actualizado correctamente.' })
    } catch (error) {
      setProfileStatus({ type: 'error', message: error.message || 'No se pudo actualizar el perfil.' })
    } finally {
      setSavingProfile(false)
    }
  }

  async function handleEmailSave(event) {
    event.preventDefault()
    setSavingEmail(true)
    setEmailStatus({ type: '', message: '' })

    try {
      const normalizedEmail = newEmail.trim()
      if (!normalizedEmail) throw new Error('Introduce un correo valido.')
      const { error } = await supabase.auth.updateUser({ email: normalizedEmail })
      if (error) throw error
      setEmailStatus({
        type: 'success',
        message: 'Cambio solicitado. Revisa tu correo para confirmar la nueva direccion si Supabase lo requiere.',
      })
    } catch (error) {
      setEmailStatus({ type: 'error', message: error.message || 'No se pudo actualizar el correo.' })
    } finally {
      setSavingEmail(false)
    }
  }

  async function handlePasswordSave(event) {
    event.preventDefault()
    setSavingPassword(true)
    setPasswordStatus({ type: '', message: '' })

    try {
      if (!currentPassword || !newPassword || !repeatPassword) {
        throw new Error('Completa todos los campos de contraseña.')
      }
      if (newPassword !== repeatPassword) {
        throw new Error('Las nuevas contraseñas no coinciden.')
      }
      if (newPassword.length < 6) {
        throw new Error('La nueva contraseña debe tener al menos 6 caracteres.')
      }

      const { error: authError } = await supabase.auth.signInWithPassword({
        email,
        password: currentPassword,
      })
      if (authError) throw new Error('La contraseña actual no es correcta.')

      const { error } = await supabase.auth.updateUser({ password: newPassword })
      if (error) throw error

      setCurrentPassword('')
      setNewPassword('')
      setRepeatPassword('')
      setPasswordStatus({ type: 'success', message: 'Contraseña actualizada correctamente.' })
    } catch (error) {
      setPasswordStatus({ type: 'error', message: error.message || 'No se pudo actualizar la contraseña.' })
    } finally {
      setSavingPassword(false)
    }
  }

  const initial = email ? email[0].toUpperCase() : 'U'

  return (
    <main className="min-h-screen bg-base px-3 py-5 text-primary sm:px-5 md:px-8">
      <div className="mx-auto w-full max-w-5xl">
        <section className="rounded-2xl border border-red-500/25 bg-gradient-to-r from-red-600/10 via-surface to-red-500/5 p-4 shadow-sm sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] uppercase tracking-[0.15em] text-muted">Perfil</p>
              <h1 className="mt-1 text-2xl font-semibold font-outfit sm:text-3xl">Mi cuenta</h1>
              <p className="mt-2 text-sm text-secondary">
                Gestiona tu perfil, el correo de acceso, la contraseña y la imagen asociada a la cuenta.
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

        <section className="mt-4 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <article className="rounded-2xl border border-red-500/20 bg-surface p-5">
            <div className="flex items-center gap-4">
              <div className="h-24 w-24 overflow-hidden rounded-full border border-red-500/35 bg-surface-elevated">
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt="Foto de perfil"
                    className="h-full w-full object-cover"
                    draggable={false}
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-3xl font-semibold text-primary">
                    {initial}
                  </div>
                )}
              </div>
              <div className="min-w-0">
                <h2 className="truncate text-xl font-semibold">{fullName || initialName}</h2>
                <p className="mt-1 truncate text-sm text-secondary">{email}</p>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="mt-3 inline-flex items-center gap-2 rounded-lg border border-border-light bg-surface-elevated px-3 py-2 text-xs font-medium text-secondary hover:bg-surface-hover hover:text-primary transition-colors"
                >
                  <ImagePlus size={14} />
                  Cambiar imagen
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={handleAvatarChange}
                />
              </div>
            </div>

            <form className="mt-6 space-y-3" onSubmit={handleProfileSave}>
              {profileStatus.message ? (
                <div className={`rounded-xl border px-3 py-2 text-sm ${profileStatus.type === 'success' ? 'border-green-500/30 bg-green-500/10 text-green-700 dark:text-green-300' : 'border-red-500/30 bg-red-500/10 text-red-600'}`}>
                  {profileStatus.message}
                </div>
              ) : null}

              <div>
                <label className="mb-1.5 block text-xs font-medium uppercase tracking-[0.12em] text-muted">
                  Nombre visible
                </label>
                <input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Nombre y apellidos"
                  className="w-full rounded-xl border border-border-light bg-surface-elevated px-3 py-2.5 text-sm text-primary outline-none transition-colors focus:border-red-500/45"
                />
              </div>

              <button
                type="submit"
                disabled={savingProfile}
                className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-500 transition-colors disabled:opacity-60"
              >
                <Save size={15} />
                {savingProfile ? 'Guardando...' : 'Guardar perfil'}
              </button>
            </form>
          </article>

          <aside className="space-y-4">
            <article className="rounded-2xl border border-red-500/20 bg-surface p-5">
              <div className="flex items-center gap-2">
                <Mail size={18} className="text-red-500" />
                <h2 className="text-base font-semibold">Cambiar correo</h2>
              </div>
              <form className="mt-4 space-y-3" onSubmit={handleEmailSave}>
                {emailStatus.message ? (
                  <div className={`rounded-xl border px-3 py-2 text-sm ${emailStatus.type === 'success' ? 'border-green-500/30 bg-green-500/10 text-green-700 dark:text-green-300' : 'border-red-500/30 bg-red-500/10 text-red-600'}`}>
                    {emailStatus.message}
                  </div>
                ) : null}
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="nuevo@correo.com"
                  className="w-full rounded-xl border border-border-light bg-surface-elevated px-3 py-2.5 text-sm text-primary outline-none transition-colors focus:border-red-500/45"
                />
                <button
                  type="submit"
                  disabled={savingEmail}
                  className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-500 transition-colors disabled:opacity-60"
                >
                  <Save size={15} />
                  {savingEmail ? 'Guardando...' : 'Actualizar correo'}
                </button>
              </form>
            </article>

            <article className="rounded-2xl border border-red-500/20 bg-surface p-5">
              <div className="flex items-center gap-2">
                <KeyRound size={18} className="text-red-500" />
                <h2 className="text-base font-semibold">Cambiar contraseña</h2>
              </div>
              <form className="mt-4 space-y-3" onSubmit={handlePasswordSave}>
                {passwordStatus.message ? (
                  <div className={`rounded-xl border px-3 py-2 text-sm ${passwordStatus.type === 'success' ? 'border-green-500/30 bg-green-500/10 text-green-700 dark:text-green-300' : 'border-red-500/30 bg-red-500/10 text-red-600'}`}>
                    {passwordStatus.message}
                  </div>
                ) : null}
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Contraseña actual"
                  className="w-full rounded-xl border border-border-light bg-surface-elevated px-3 py-2.5 text-sm text-primary outline-none transition-colors focus:border-red-500/45"
                />
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Nueva contraseña"
                  className="w-full rounded-xl border border-border-light bg-surface-elevated px-3 py-2.5 text-sm text-primary outline-none transition-colors focus:border-red-500/45"
                />
                <input
                  type="password"
                  value={repeatPassword}
                  onChange={(e) => setRepeatPassword(e.target.value)}
                  placeholder="Repite la nueva contraseña"
                  className="w-full rounded-xl border border-border-light bg-surface-elevated px-3 py-2.5 text-sm text-primary outline-none transition-colors focus:border-red-500/45"
                />
                <button
                  type="submit"
                  disabled={savingPassword}
                  className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-500 transition-colors disabled:opacity-60"
                >
                  <ShieldCheck size={15} />
                  {savingPassword ? 'Actualizando...' : 'Actualizar contraseña'}
                </button>
              </form>
            </article>

            <article className="rounded-2xl border border-red-500/20 bg-surface p-5">
              <div className="flex items-center gap-2">
                <UserRound size={18} className="text-red-500" />
                <h2 className="text-base font-semibold">Notas</h2>
              </div>
              <p className="mt-3 text-sm text-secondary">
                El cambio de correo puede requerir confirmacion por email segun la configuracion de Supabase.
              </p>
              <p className="mt-2 text-sm text-secondary">
                La imagen de perfil se sube al bucket `avatars` de Supabase Storage y la URL publica se guarda en tu usuario.
              </p>
            </article>
          </aside>
        </section>
      </div>
    </main>
  )
}
