import { useState, useRef } from 'react'
import { useAuthUser } from '../hooks/useAuthUser'
import { supabase } from '../lib/supabase'
import { User, Mail, Key, Camera, Shield } from 'lucide-react'

export function MiCuenta() {
  const { user, refreshUser } = useAuthUser()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Estados para cambiar nombre
  const [newName, setNewName] = useState(user?.user_metadata?.full_name || user?.user_metadata?.name || '')

  // Estados para cambiar contraseña
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  // Estados para imagen de perfil
  const [avatarFile, setAvatarFile] = useState(null)
  const [avatarPreview, setAvatarPreview] = useState(user?.user_metadata?.avatar_url || '')
  const fileInputRef = useRef(null)

  if (!user) {
    return <div className="min-h-screen bg-base text-primary p-8">Cargando...</div>
  }

  const handleUpdateName = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')
    try {
      const { error } = await supabase.auth.updateUser({
        data: { full_name: newName }
      })
      if (error) throw error
      setSuccess('Nombre actualizado correctamente.')
      await refreshUser() // Refrescar el usuario para ver cambios
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleUpdatePassword = async (e) => {
    e.preventDefault()
    if (newPassword !== confirmPassword) {
      setError('Las contraseñas nuevas no coinciden.')
      return
    }
    if (newPassword.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.')
      return
    }
    setLoading(true)
    setError('')
    setSuccess('')
    try {
      // Supabase no requiere contraseña actual para cambiar, pero podemos verificar si es necesario
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      })
      if (error) throw error
      setSuccess('Contraseña actualizada correctamente.')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleAvatarChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      setAvatarFile(file)
      const reader = new FileReader()
      reader.onload = () => setAvatarPreview(reader.result)
      reader.readAsDataURL(file)
    }
  }

  const handleUpdateAvatar = async (e) => {
    e.preventDefault()
    if (!avatarFile) return
    setLoading(true)
    setError('')
    setSuccess('')
    try {
      const fileExt = avatarFile.name.split('.').pop()
      const fileName = `avatars/${user.id}_${Date.now()}.${fileExt}`
      const { data, error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, avatarFile, { upsert: true })
      if (uploadError) throw uploadError
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName)
      const { error } = await supabase.auth.updateUser({
        data: { avatar_url: publicUrl }
      })
      if (error) throw error
      setSuccess('Imagen de perfil actualizada correctamente.')
      setAvatarFile(null)
      await refreshUser()
    } catch (err) {
      let errorMsg = err.message
      if (errorMsg.includes('Bucket not found')) {
        errorMsg = 'El bucket "avatars" no existe en Supabase Storage. Ve a tu Supabase Dashboard > Storage > Create bucket llamado "avatars" con permisos públicos.'
      }
      setError(errorMsg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-base via-surface to-base px-4 py-6 text-primary sm:px-6 md:px-8">
      <div className="mx-auto w-full max-w-6xl">
        {/* Header Hero */}
        <section className="relative overflow-hidden rounded-3xl border border-red-500/20 bg-gradient-to-r from-red-600/10 via-surface to-red-500/5 p-6 shadow-2xl sm:p-8 md:p-10">
          <div className="relative z-10">
            <div className="flex flex-col items-center text-center gap-4 sm:flex-row sm:items-start sm:justify-between sm:text-left">
              <div className="flex-1">
                <p className="text-xs uppercase tracking-[0.2em] text-red-500 font-semibold">Gestión de cuenta</p>
                <h1 className="mt-2 text-3xl font-bold font-outfit sm:text-4xl md:text-5xl">Mi Cuenta</h1>
                <p className="mt-3 text-base text-secondary max-w-2xl">
                  Gestiona tu perfil, actualiza tu información personal y mantén tu cuenta segura con herramientas avanzadas de administración.
                </p>
              </div>
              <div className="mt-6 sm:mt-0">
                <div className="relative">
                  <div className="absolute inset-0 rounded-2xl bg-red-500/20 blur-xl"></div>
                  <div className="relative rounded-2xl bg-gradient-to-br from-red-500/20 to-red-600/20 p-6 flex items-center justify-center">
                    {avatarPreview ? (
                      <img
                        src={avatarPreview}
                        alt="Avatar de usuario"
                        className="w-20 h-20 rounded-full border-4 border-red-300/30 object-cover"
                      />
                    ) : (
                      <User size={48} className="text-red-500" />
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
          {/* Decorative elements */}
          <div className="absolute top-4 right-4 w-20 h-20 bg-red-500/10 rounded-full blur-2xl"></div>
          <div className="absolute bottom-4 left-4 w-16 h-16 bg-red-600/10 rounded-full blur-xl"></div>
        </section>

        {/* Status Messages */}
        {(error || success) && (
          <section className="mt-6 rounded-2xl border border-red-500/20 bg-surface p-4">
            {error && (
              <div className="flex items-center gap-3 text-red-600">
                <div className="rounded-full bg-red-100 p-2">
                  <Shield size={16} />
                </div>
                <p className="text-sm">{error}</p>
              </div>
            )}
            {success && (
              <div className="flex items-center gap-3 text-green-600">
                <div className="rounded-full bg-green-100 p-2">
                  <Shield size={16} />
                </div>
                <p className="text-sm">{success}</p>
              </div>
            )}
          </section>
        )}

        {/* Account Info */}
        <section className="mt-8 rounded-2xl border border-red-500/20 bg-surface p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="rounded-xl bg-red-500/10 p-2">
              <User size={24} className="text-red-500" />
            </div>
            <div>
              <h2 className="text-xl font-semibold">Información de la Cuenta</h2>
              <p className="text-sm text-secondary">Detalles básicos de tu cuenta</p>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-border-light bg-surface-elevated p-4">
              <div className="flex items-center gap-3 mb-2">
                <Mail size={16} className="text-red-500" />
                <span className="text-sm font-medium text-secondary">Correo Electrónico</span>
              </div>
              <p className="text-primary">{user.email}</p>
            </div>
            <div className="rounded-xl border border-border-light bg-surface-elevated p-4">
              <div className="flex items-center gap-3 mb-2">
                <Shield size={16} className="text-red-500" />
                <span className="text-sm font-medium text-secondary">ID de Usuario</span>
              </div>
              <p className="text-primary font-mono text-sm">{user.id}</p>
            </div>
          </div>
        </section>

        {/* Profile Management */}
        <section className="mt-8 grid gap-6 lg:grid-cols-2">
          {/* Change Name */}
          <article className="rounded-2xl border border-red-500/20 bg-surface p-6">
            <div className="flex items-center gap-3 mb-4">
              <User size={24} className="text-red-500" />
              <h2 className="text-xl font-semibold">Cambiar Nombre</h2>
            </div>
            <p className="text-secondary mb-4">
              Actualiza tu nombre completo para que aparezca en tu perfil.
            </p>
            <form onSubmit={handleUpdateName} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Nombre Completo</label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full rounded-lg border border-border-light bg-surface-elevated px-3 py-2 text-sm focus:border-red-500 focus:outline-none"
                  placeholder="Tu nombre completo"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-lg bg-red-600 px-4 py-3 text-sm font-semibold text-white hover:bg-red-500 disabled:opacity-50 transition-colors"
              >
                {loading ? 'Actualizando...' : 'Actualizar Nombre'}
              </button>
            </form>
          </article>

          {/* Change Avatar */}
          <article className="rounded-2xl border border-red-500/20 bg-surface p-6">
            <div className="flex items-center gap-3 mb-4">
              <Camera size={24} className="text-red-500" />
              <h2 className="text-xl font-semibold">Imagen de Perfil</h2>
            </div>
            <p className="text-secondary mb-4">
              Sube una foto de perfil para personalizar tu cuenta.
            </p>
            <form onSubmit={handleUpdateAvatar} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Seleccionar Imagen</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  ref={fileInputRef}
                  className="w-full rounded-lg border border-border-light bg-surface-elevated px-3 py-2 text-sm file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-red-600 file:text-white hover:file:bg-red-500"
                />
                {avatarPreview && (
                  <div className="mt-4 flex justify-center">
                    <img
                      src={avatarPreview}
                      alt="Vista previa de perfil"
                      className="w-24 h-24 rounded-full object-cover border-4 border-red-500/20 shadow-lg"
                    />
                  </div>
                )}
              </div>
              <button
                type="submit"
                disabled={loading || !avatarFile}
                className="w-full rounded-lg bg-red-600 px-4 py-3 text-sm font-semibold text-white hover:bg-red-500 disabled:opacity-50 transition-colors"
              >
                {loading ? 'Subiendo...' : 'Actualizar Imagen'}
              </button>
            </form>
          </article>
        </section>

        {/* Password Change */}
        <section className="mt-8 rounded-2xl border border-red-500/20 bg-surface p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="rounded-xl bg-red-500/10 p-2">
              <Key size={24} className="text-red-500" />
            </div>
            <div>
              <h2 className="text-xl font-semibold">Cambiar Contraseña</h2>
              <p className="text-sm text-secondary">Mantén tu cuenta segura con una contraseña fuerte</p>
            </div>
          </div>
          <form onSubmit={handleUpdatePassword} className="max-w-md space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Nueva Contraseña</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full rounded-lg border border-border-light bg-surface-elevated px-3 py-2 text-sm focus:border-red-500 focus:outline-none"
                placeholder="Mínimo 6 caracteres"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Confirmar Nueva Contraseña</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full rounded-lg border border-border-light bg-surface-elevated px-3 py-2 text-sm focus:border-red-500 focus:outline-none"
                placeholder="Repite la nueva contraseña"
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-red-600 px-4 py-3 text-sm font-semibold text-white hover:bg-red-500 disabled:opacity-50 transition-colors"
            >
              {loading ? 'Actualizando...' : 'Actualizar Contraseña'}
            </button>
          </form>
        </section>
      </div>
    </main>
  )
}
