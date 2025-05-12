import { createClient } from '@supabase/supabase-js'

if (!process.env.DATABASE_URL) {
  throw new Error('Missing DATABASE_URL environment variable')
}

// Extract the URL and anon key from the connection string
const url = process.env.DATABASE_URL.split('@')[0]
const anonKey = process.env.DATABASE_URL.split('@')[1]

export const supabase = createClient(url, anonKey) 