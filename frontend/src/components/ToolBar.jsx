export function ToolBar() {
  return (
    <div className="h-16 bg-white shadow-md flex items-center px-6">
      <h2 className="font-bold text-gray-700">XPRIN Editor</h2>
      <div className="ml-auto flex gap-4">
        {/* Placeholder buttons */}
        <button className="px-4 py-1.5 bg-gray-100 rounded text-sm hover:bg-gray-200 transition">Añadir Texto</button>
        <button className="px-4 py-1.5 bg-gray-100 rounded text-sm hover:bg-gray-200 transition">Subir Imagen</button>
      </div>
    </div>
  )
}
