// Panel lateral de capas por color con asignación de spot
// Responsable: Andrea + Alejandro

import { useStore } from '../store'

const SPOTS = [
  { value: null,      label: 'CMYK (sin spot)', color: '#888' },
  { value: 'w1',      label: 'W1',              color: '#aaa' },
  { value: 'w2',      label: 'W2',              color: '#7b8cde' },
  { value: 'texture', label: 'TEXTURE',         color: '#f0b429' },
]

function SpotBadge({ spot }) {
  const s = SPOTS.find((x) => x.value === spot)
  if (!s || s.value === null) return null
  return (
    <span
      className="text-xs px-2 py-0.5 rounded-full font-medium"
      style={{ background: s.color + '33', color: s.color, border: `1px solid ${s.color}66` }}
    >
      {s.label}
    </span>
  )
}

export function LayerPanel() {
  const { capas, capaActivaId, setCapaActiva, asignarSpot } = useStore()

  const spotCount = capas.filter((c) => c.spot !== null).length

  return (
    <div className="w-72 bg-white border-l border-gray-200 flex flex-col">

      {/* Cabecera */}
      <div className="px-4 py-3 border-b border-gray-100">
        <h2 className="font-bold text-gray-800 text-sm uppercase tracking-wide">
          Capas por color
        </h2>
        <p className="text-xs text-gray-400 mt-0.5">
          {capas.length} capas · {spotCount} con spot asignado
        </p>
      </div>

      {/* Lista de capas */}
      <div className="flex-1 overflow-y-auto">
        {capas.length === 0 && (
          <p className="text-gray-400 text-sm p-4">
            Sube una imagen para ver las capas detectadas.
          </p>
        )}

        {capas.map((capa) => {
          const isActive = capa.id === capaActivaId
          return (
            <div
              key={capa.id}
              onClick={() => setCapaActiva(capa.id)}
              className={`px-3 py-2.5 border-b border-gray-100 cursor-pointer transition-colors ${
                isActive ? 'bg-blue-50 border-l-2 border-l-blue-500' : 'hover:bg-gray-50'
              }`}
            >
              {/* Fila superior: swatch + nombre + toggle visibilidad */}
              <div className="flex items-center gap-2">
                <div
                  className="w-5 h-5 rounded-sm flex-shrink-0 border border-gray-200"
                  style={{ background: capa.color }}
                />
                <span className="text-sm text-gray-700 flex-1 truncate font-medium">
                  {capa.nombre}
                </span>
                <span className="text-xs text-gray-400 flex-shrink-0">
                  {(capa.area_px / 1000).toFixed(1)}k px
                </span>
              </div>

              {/* Selector de spot */}
              <div className="mt-2 flex items-center gap-2">
                <select
                  value={capa.spot ?? ''}
                  onChange={(e) => {
                    e.stopPropagation()
                    asignarSpot(capa.id, e.target.value === '' ? null : e.target.value)
                  }}
                  onClick={(e) => e.stopPropagation()}
                  className="flex-1 text-xs border border-gray-200 rounded px-2 py-1 bg-white text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-400"
                >
                  {SPOTS.map((s) => (
                    <option key={s.value ?? 'null'} value={s.value ?? ''}>
                      {s.label}
                    </option>
                  ))}
                </select>
                <SpotBadge spot={capa.spot} />
              </div>

              <div className="mt-1 text-xs text-gray-400">
                {capa.zonas.length} zona{capa.zonas.length !== 1 ? 's' : ''}
              </div>
            </div>
          )
        })}
      </div>

      {/* Leyenda de spots */}
      <div className="px-4 py-3 border-t border-gray-100 bg-gray-50">
        <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">Spots UV</p>
        <div className="flex flex-col gap-1">
          {SPOTS.filter((s) => s.value !== null).map((s) => (
            <div key={s.value} className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-sm" style={{ background: s.color }} />
              <span className="text-xs text-gray-600">{s.label}</span>
              <span className="text-xs text-gray-400 ml-auto">
                {capas.filter((c) => c.spot === s.value).length} capa(s)
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
