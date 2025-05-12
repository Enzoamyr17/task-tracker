import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';

export default async function TestPage() {
  try {
    const cookieStore = cookies()
    const supabase = createClient(cookieStore)

    // Test the connection
    const { data, error } = await supabase.from('todos').select('count')

    return (
      <div className="p-4">
        <h1 className="text-xl font-bold mb-4">Supabase Connection Test</h1>
        <div className="mb-4">
          <h2 className="font-semibold">Environment Variables:</h2>
          <pre className="bg-gray-100 p-4 rounded mt-2">
            NEXT_PUBLIC_SUPABASE_URL: {process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅ Set' : '❌ Not Set'}
            {'\n'}
            NEXT_PUBLIC_SUPABASE_ANON_KEY: {process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '✅ Set' : '❌ Not Set'}
          </pre>
        </div>
        <div>
          <h2 className="font-semibold">Database Connection:</h2>
          <pre className="bg-gray-100 p-4 rounded mt-2">
            {error ? JSON.stringify(error, null, 2) : '✅ Connected successfully'}
          </pre>
        </div>
      </div>
    )
  } catch (error) {
    return (
      <div className="p-4 text-red-500">
        <h1 className="text-xl font-bold mb-4">Error Testing Connection</h1>
        <pre className="bg-gray-100 p-4 rounded">
          {JSON.stringify(error, null, 2)}
        </pre>
      </div>
    )
  }
} 