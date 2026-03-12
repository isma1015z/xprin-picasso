const STORAGE_KEY = 'xprin_saved_projects_v1'

export function listSavedProjects() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const arr = raw ? JSON.parse(raw) : []
    return Array.isArray(arr) ? arr : []
  } catch {
    return []
  }
}

export function saveProject(record) {
  const all = listSavedProjects()
  const next = [record, ...all.filter((p) => p.id !== record.id)]
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  return next
}

export function deleteProject(id) {
  const next = listSavedProjects().filter((p) => p.id !== id)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  return next
}

