import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

/**
 * Singleton Supabase Client untuk WismaKu Internal Backoffice.
 * Menggunakan publishable anon key dengan session persisten.
 * Hak akses dibatasi melalui Row Level Security (RLS) berbasis role di database.
 */
export const supabase =
  url && anonKey
    ? createClient(url, anonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
        },
      })
    : null
