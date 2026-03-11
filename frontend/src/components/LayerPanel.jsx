export function LayerPanel() {
  return (
    <div className="w-64 bg-white shadow-l flex flex-col border-l border-gray-200">
      <div className="p-4 border-b border-gray-200">
        <h3 className="font-bold text-gray-700">Capas</h3>
      </div>
      <div className="p-4 flex-1 overflow-y-auto hidden-scrollbar">
        <p className="text-sm text-gray-500 italic">No hay capas activas</p>
      </div>
    </div>
  )
}
