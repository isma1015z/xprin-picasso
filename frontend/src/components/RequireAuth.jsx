import { Navigate, useLocation } from 'react-router-dom'
import { useAuthUser } from '../hooks/useAuthUser'
import { useEffect, useState } from 'react'

export function RequireAuth({ children }) {
  const { user, loading } = useAuthUser()
  const location = useLocation()
  const [authChecked, setAuthChecked] = useState(false)

  useEffect(() => {
    if (!loading) {
      // Dar un poco más de tiempo para asegurar que la sesión se recupere
      const timer = setTimeout(() => setAuthChecked(true), 500)
      return () => clearTimeout(timer)
    }
  }, [loading])

  if (loading || !authChecked) {
    return (
      <main className="min-h-screen grid place-items-center bg-base text-primary">
        <p className="text-sm text-secondary">Comprobando sesión...</p>
      </main>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  return children
}
