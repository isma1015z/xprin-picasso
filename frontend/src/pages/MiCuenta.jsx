import { useAuthUser } from '../hooks/useAuthUser'

export function MiCuenta() {
  const { user } = useAuthUser()

  if (!user) {
    return <div>Cargando...</div>
  }

  return (
    <div className="min-h-screen bg-brand-white p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-brand-dark mb-8">Mi Cuenta</h1>
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">Información de la Cuenta</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Nombre</label>
              <p className="mt-1 text-sm text-gray-900">{user.user_metadata?.full_name || user.user_metadata?.name || 'No especificado'}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Correo Electrónico</label>
              <p className="mt-1 text-sm text-gray-900">{user.email}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">ID de Usuario</label>
              <p className="mt-1 text-sm text-gray-900">{user.id}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}