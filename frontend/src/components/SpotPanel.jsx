// Panel lateral derecho con los 3 canales spot
// Responsable: Andrea + Alejandro

export function SpotPanel() {
  return (
    <div className="w-64 bg-white border-l border-gray-200 p-4 flex flex-col gap-4">
      <h2 className="font-bold text-gray-700 text-sm uppercase tracking-wide">Canales Spot</h2>

      {/* Spot 1 */}
      <div className="p-3 rounded-lg border border-gray-200">
        <p className="font-semibold text-sm text-gray-700">White Base</p>
        <p className="text-xs text-gray-400 mt-1">Blanco de base — se imprime primero</p>
      </div>

      {/* Spot 2 */}
      <div className="p-3 rounded-lg border border-gray-200">
        <p className="font-semibold text-sm text-gray-700">White Relieve</p>
        <p className="text-xs text-gray-400 mt-1">Blanco de altura — crea relieve 3D</p>
      </div>

      {/* Spot 3 */}
      <div className="p-3 rounded-lg border border-gray-200">
        <p className="font-semibold text-sm text-gray-700">Varnish</p>
        <p className="text-xs text-gray-400 mt-1">Barniz UV — capa final de brillo</p>
      </div>
    </div>
  )
}
