export function Configuracion() {
  return (
    <div className="min-h-screen bg-brand-white p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-brand-dark mb-8">Configuración</h1>
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">Configuraciones Generales</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Tema</label>
              <p className="mt-1 text-sm text-gray-900">Configuración de tema próximamente.</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Notificaciones</label>
              <p className="mt-1 text-sm text-gray-900">Configuración de notificaciones próximamente.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
