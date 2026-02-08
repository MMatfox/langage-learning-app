import { createClient } from '@supabase/supabase-js'

// Vite utilise "import.meta.env" pour lire le fichier .env
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)