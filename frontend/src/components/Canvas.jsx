// Canvas del editor — previsualización siempre en contenedor de tamaño fijo
// Responsable: Juan

import { useStore } from '../store'

const CANVAS_SIZE = 600   // px — tamaño fijo del área de previsualización

function formaToSVGPath(forma, alto) {
  return forma
    .map((cmd) => {
      const y = alto - cmd.y
      if (cmd.tipo === 'moveto')    return `M ${cmd.x} ${y}`
      if (cmd.tipo === 'lineto')    return `L ${cmd.x} ${y}`
      if (cmd.tipo === 'closepath') return 'Z'
      return ''
    })
    .join(' ')
}

export function Canvas() {
  const { imagenUrl, imagenSize, capas, capaActivaId } = useStore()
  const { ancho, alto } = imagenSize
  const capaActiva = capas.find((c) => c.id === capaActivaId) ?? null

  if (!imagenUrl) {
    return (
      <div
        className="flex items-center justify-center bg-gray-50 rounded-lg border-2 border-dashed border-gray-300 m-4"
        style={{ width: CANVAS_SIZE, height: CANVAS_SIZE, flexShrink: 0 }}
      >
        <p className="text-gray-400 text-sm">Sube una imagen para empezar</p>
      </div>
    )
  }

  // Escala uniforme para que la imagen quepa en CANVAS_SIZE × CANVAS_SIZE
  const scale  = Math.min(CANVAS_SIZE / ancho, CANVAS_SIZE / alto)
  const drawW  = ancho * scale
  const drawH  = alto  * scale
  // Centrado dentro del contenedor fijo
  const offsetX = (CANVAS_SIZE - drawW) / 2
  const offsetY = (CANVAS_SIZE - drawH) / 2

  return (
    <div className="flex-1 flex items-center justify-center bg-gray-100 overflow-auto p-4">
      {/*
        Contenedor fijo CANVAS_SIZE×CANVAS_SIZE.
        El SVG interior tiene el mismo tamaño fijo.
        La imagen se escala y centra manualmente con transform.
        Paths y overlays usan las coordenadas reales de la imagen escalada.
      */}
      <div
        className="relative bg-white rounded-lg overflow-hidden flex-shrink-0"
        style={{
          width:     CANVAS_SIZE,
          height:    CANVAS_SIZE,
          boxShadow: '0 2px 16px rgba(0,0,0,0.15)',
        }}
      >
        {/* Imagen base escalada */}
        <img
          src={imagenUrl}
          alt="base"
          style={{
            position:  'absolute',
            left:      offsetX,
            top:       offsetY,
            width:     drawW,
            height:    drawH,
            display:   'block',
          }}
          draggable={false}
        />

        {/* SVG de overlays — mismo tamaño fijo, transform igual a la imagen */}
        <svg
          style={{
            position: 'absolute',
            left:     offsetX,
            top:      offsetY,
            width:    drawW,
            height:   drawH,
            overflow: 'visible',
          }}
          viewBox={`0 0 ${ancho} ${alto}`}
        >
          {/* Capas con spot asignado */}
          {capas
            .filter((c) => c.visible && c.spot !== null)
            .map((capa) =>
              capa.zonas.map((zona) => (
                <path
                  key={zona.id}
                  d={formaToSVGPath(zona.forma, alto)}
                  fill={capa.color}
                  fillOpacity={0.30}
                  stroke={capa.color}
                  strokeWidth={1.5 / scale}
                  strokeOpacity={0.7}
                />
              ))
            )}

          {/* Capa activa resaltada */}
          {capaActiva &&
            capaActiva.zonas.map((zona) => (
              <path
                key={`active-${zona.id}`}
                d={formaToSVGPath(zona.forma, alto)}
                fill={capaActiva.color}
                fillOpacity={0.45}
                stroke="white"
                strokeWidth={2.5 / scale}
                strokeDasharray={`${6 / scale} ${3 / scale}`}
              />
            ))}
        </svg>
      </div>
    </div>
  )
}
