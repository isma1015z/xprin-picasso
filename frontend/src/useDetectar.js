// useDetectar.js — lógica de detección compartida entre Header y DetectionSettings
import { useStore } from './store'
//Proceso
import { getDetectedImageUrl } from './detectedImageUrl'

export function useDetectar() {
  const {
    setCargando, setError, setProyecto, setLastFile,
    buildDetectionForm,
  } = useStore()

  async function detectar(file) {
    if (!file) return
    setCargando(true)
    setError(null)
    try {
      const localUrl = URL.createObjectURL(file)
      const res = await fetch('/api/detect-color-zones', {
        method: 'POST',
        body: buildDetectionForm(file),
      })
      if (!res.ok) {
        const raw = await res.text()
        let detail = raw || res.statusText || 'Error del servidor'
        try { detail = JSON.parse(raw).detail ?? detail } catch {}
        throw new Error(detail)
      }
      const data = await res.json()
      //Proceso
      const detectedUrl = getDetectedImageUrl(data, localUrl)
      setProyecto({
        proyectoId: data.id,
        nombre:     data.nombre,
        imagenUrl:  detectedUrl,
        ancho:      data.documento.ancho,
        alto:       data.documento.alto,
        capas:      data.capas,
      })
      setLastFile(file)
    } catch (err) {
      setError(err.message)
    } finally {
      setCargando(false)
    }
  }

  return { detectar }
}
