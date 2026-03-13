import { Navigate, useLocation } from 'react-router-dom'
import { useAuthUser } from '../hooks/useAuthUser'

export function RequireAuth({ children }) {
  const { user, loading } = useAuthUser()
  const location = useLocation()

  if (loading) {
    return (
      <main className="min-h-screen grid place-items-center bg-base text-primary">
        <p className="text-sm text-secondary">Comprobando sesion...</p>
      </main>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  return children
}
