// Pagina principal del editor
// Responsable: Andrea + Alejandro

import { Canvas } from '../components/Canvas'
import { ToolBar } from '../components/ToolBar'
import { SpotPanel } from '../components/SpotPanel'
import { TextureLibrary } from '../components/TextureLibrary'

export function Editor() {
  return (
    <div className="flex flex-col h-screen bg-gray-100">
      <ToolBar />
      <div className="flex flex-1 overflow-hidden">
        <Canvas />
        <SpotPanel />
      </div>
      <TextureLibrary />
    </div>
  )
}
