import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL  = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_KEY  = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Faltan las variables de entorno de Supabase. Revisa el archivo frontend/.env')
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)
