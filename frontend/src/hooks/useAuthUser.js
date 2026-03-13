import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export function useAuthUser() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  async function refreshUser() {
    const { data } = await supabase.auth.getUser()
    setUser(data?.user ?? null)
    setLoading(false)
    return data?.user ?? null
  }

  useEffect(() => {
    let mounted = true

    const initializeAuth = async () => {
      try {
        // Refrescar la sesión para asegurar persistencia
        const { data, error } = await supabase.auth.refreshSession()
        if (error) {
          console.log('Error refreshing session:', error)
        }
        if (mounted) {
          setUser(data?.user ?? null)
          setLoading(false)
        }
      } catch (err) {
        console.log('Error initializing auth:', err)
        if (mounted) {
          setUser(null)
          setLoading(false)
        }
      }
    }

    initializeAuth()

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return
      setUser(session?.user ?? null)
      setLoading(false)
    })

    return () => {
      mounted = false
      listener?.subscription?.unsubscribe?.()
    }
  }, [])

  return { user, loading, refreshUser }
}
