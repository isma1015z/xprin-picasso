// Punto único de acceso a Supabase en toda la app.
// Tanto las páginas de auth (lib/supabase.js) como los módulos internos
// importan desde aquí para compartir la misma instancia del cliente.
// IMPORTANTE: evitar ciclo de referencia. Aquí se importa de src/supabase.js,
// no de sí mismo.
export { supabase } from '../supabase'

