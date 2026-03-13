import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { CircleHelp, LogOut, Settings, UserRound } from 'lucide-react'
import { useAuthUser } from '../hooks/useAuthUser'
import { supabase } from '../lib/supabase'

function getAvatarUrl(user) {
  return (
    user?.user_metadata?.avatar_url
    || user?.user_metadata?.picture
    || user?.identities?.[0]?.identity_data?.avatar_url
    || null
  )
}

export function UserProfileBadge() {
  const navigate = useNavigate()
  const rootRef = useRef(null)
  const [open, setOpen] = useState(false)
  const [signingOut, setSigningOut] = useState(false)
  const { user, loading } = useAuthUser()
  const avatarUrl = getAvatarUrl(user)
  const email = user?.email || ''
  const initial = email ? email[0].toUpperCase() : 'U'
  const displayName = useMemo(() => {
    return (
      user?.user_metadata?.full_name
      || user?.user_metadata?.name
      || email.split('@')[0]
      || 'Usuario'
    )
  }, [user, email])

  useEffect(() => {
    if (!open) return
    const onDocClick = (event) => {
      if (!rootRef.current?.contains(event.target)) setOpen(false)
    }
    const onKeyDown = (event) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onDocClick)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  async function handleSignOut() {
    setSigningOut(true)
    try {
      await supabase.auth.signOut()
      setOpen(false)
      navigate('/login')
    } finally {
      setSigningOut(false)
    }
  }

  if (loading) {
    return <div className="h-9 w-9 rounded-full border border-border-light bg-surface-elevated animate-pulse" />
  }

  if (!user) {
    return (
      <div className="flex items-center gap-2 text-xs sm:text-sm font-medium">
        <Link to="/login" className="text-secondary hover:text-primary transition-colors">Login</Link>
        <span className="text-muted">/</span>
        <Link to="/registro" className="text-secondary hover:text-primary transition-colors">Registrate</Link>
      </div>
    )
  }

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`h-9 w-9 shrink-0 overflow-hidden rounded-full border bg-surface-elevated transition-colors cursor-pointer ${
          open ? 'border-red-500/80 ring-2 ring-red-500/20' : 'border-red-500/35 hover:border-red-500/65'
        }`}
        title="Perfil de usuario"
        aria-label="Perfil de usuario"
      >
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt="Foto de perfil"
            className="h-full w-full object-cover"
            draggable={false}
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xs font-semibold text-primary">
            {initial}
          </div>
        )}
      </button>

      <div
        className={`absolute left-0 top-[calc(100%+10px)] z-[180] w-[300px] max-w-[88vw] overflow-hidden rounded-2xl border border-red-500/25 bg-surface shadow-[0_20px_45px_rgba(0,0,0,0.28)] transition-all duration-200 ${
          open ? 'pointer-events-auto translate-y-0 opacity-100 scale-100' : 'pointer-events-none -translate-y-1 opacity-0 scale-[0.98]'
        }`}
      >
        <div className="border-b border-border-light bg-gradient-to-r from-red-600/10 via-surface to-red-500/5 p-3">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 shrink-0 overflow-hidden rounded-full border border-red-500/35 bg-surface-elevated">
              {avatarUrl ? (
                <img src={avatarUrl} alt="Foto de perfil" className="h-full w-full object-cover" draggable={false} referrerPolicy="no-referrer" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-sm font-semibold text-primary">{initial}</div>
              )}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-primary">{displayName}</p>
              <p className="truncate text-xs text-muted">{email}</p>
            </div>
          </div>
        </div>

        <div className="p-2">
          <button
            type="button"
            onClick={() => { setOpen(false); navigate('/mi-cuenta') }}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-sm text-secondary hover:bg-surface-elevated hover:text-primary transition-colors cursor-pointer"
          >
            <UserRound size={16} />
            Mi cuenta
          </button>
          <button
            type="button"
            onClick={() => { setOpen(false); navigate('/configuracion') }}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-sm text-secondary hover:bg-surface-elevated hover:text-primary transition-colors cursor-pointer"
          >
            <Settings size={16} />
            Configuracion
          </button>
          <button
            type="button"
            onClick={() => { setOpen(false); navigate('/ayuda') }}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-sm text-secondary hover:bg-surface-elevated hover:text-primary transition-colors cursor-pointer"
          >
            <CircleHelp size={16} />
            Ayuda
          </button>
        </div>

        <div className="border-t border-border-light p-2">
          <button
            type="button"
            onClick={handleSignOut}
            disabled={signingOut}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-sm text-red-500 hover:bg-red-500/10 transition-colors cursor-pointer disabled:opacity-60"
          >
            <LogOut size={16} />
            {signingOut ? 'Cerrando sesion...' : 'Cerrar sesion'}
          </button>
        </div>
      </div>
    </div>
  )
}
