//Proceso

export function getDetectedImageUrl(data, fallbackUrl = '') {
  const raw = data?.imagen_url || (data?.id ? `/uploads/${data.id}.png` : '')
  if (!raw) return fallbackUrl

  if (
    raw.startsWith('http://') ||
    raw.startsWith('https://') ||
    raw.startsWith('blob:') ||
    raw.startsWith('data:')
  ) {
    return raw
  }

  if (raw.startsWith('/api/')) return raw
  if (raw.startsWith('/')) return `/api${raw}`
  return `/api/${raw.replace(/^\/+/, '')}`
}
