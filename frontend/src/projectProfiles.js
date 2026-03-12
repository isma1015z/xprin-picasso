import { supabase } from './supabase'

const STORAGE_KEY = 'xprin-project-profiles-v1'

function safeRead() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

function safeWrite(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}

export async function getCurrentProfileOwner() {
  try {
    const { data } = await supabase.auth.getUser()
    return data?.user?.id ?? 'local-user'
  } catch {
    return 'local-user'
  }
}

export async function listProjectProfiles(ownerId) {
  const db = safeRead()
  const list = db[ownerId] ?? []
  return [...list].sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''))
}

export async function saveProjectProfile({ ownerId, projectId = null, name, snapshot }) {
  const db = safeRead()
  const current = db[ownerId] ?? []
  const now = new Date().toISOString()

  const existingIndex = projectId ? current.findIndex((p) => p.id === projectId) : -1
  let record

  if (existingIndex >= 0) {
    const prev = current[existingIndex]
    record = {
      ...prev,
      id: prev.id,
      name: name?.trim() || prev.name || 'Proyecto sin nombre',
      updatedAt: now,
      snapshot,
    }
    const next = [...current]
    next.splice(existingIndex, 1)
    db[ownerId] = [record, ...next]
  } else {
    record = {
      id: crypto.randomUUID(),
      name: name?.trim() || 'Proyecto sin nombre',
      createdAt: now,
      updatedAt: now,
      snapshot,
    }
    db[ownerId] = [record, ...current]
  }

  safeWrite(db)
  return record
}

export async function deleteProjectProfile({ ownerId, projectId }) {
  const db = safeRead()
  const current = db[ownerId] ?? []
  db[ownerId] = current.filter((p) => p.id !== projectId)
  safeWrite(db)
}
