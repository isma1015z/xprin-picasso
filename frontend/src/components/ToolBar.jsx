// Barra de herramientas superior del editor
// Responsable: Andrea + Alejandro
// Iconos SVG: Blanca (remoto)

export function ToolBar() {
  return (
    <div className="h-12 bg-white border-b border-gray-200 flex items-center px-4 gap-3 shadow-sm">
      <span className="font-bold text-red-700 text-sm">XPRIN-Picasso</span>
      <div className="w-px h-6 bg-gray-200 mx-1" />
      <p className="text-gray-400 text-sm">Herramientas — proximamente</p>
    </div>
  )
}
