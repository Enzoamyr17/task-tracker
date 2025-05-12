"use client";

import { useState, useEffect } from 'react';
import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';

export default function LandingPage() {
  const [tab, setTab] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  // Check for existing session
  useEffect(() => {
    const checkSession = async () => {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        window.location.href = '/dashboard';
      }
    };
    checkSession();
  }, []);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');
    const supabase = createClient();
    let result;
    
    if (tab === 'login') {
      result = await supabase.auth.signInWithPassword({ 
        email, 
        password
      });
      if (result.error) {
        setError(result.error.message);
      } else {
        window.location.href = '/dashboard';
      }
    } else {
      result = await supabase.auth.signUp({ 
        email, 
        password
      });
      if (result.error) {
        setError(result.error.message);
      } else {
        // Sign out after successful registration
        await supabase.auth.signOut();
        setSuccess('Registration successful! Please log in with your new account.');
        setTab('login');
        setEmail('');
        setPassword('');
      }
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="p-8 rounded shadow-md w-full max-w-md">
        <h1 className="text-2xl font-bold mb-6 text-center">Task Tracker</h1>
        <div className="flex mb-4">
          <button
            className={`flex-1 py-2 rounded-l ${tab === 'login' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
            onClick={() => setTab('login')}
          >
            Login
          </button>
          <button
            className={`flex-1 py-2 rounded-r ${tab === 'register' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
            onClick={() => setTab('register')}
          >
            Register
          </button>
        </div>
        <form onSubmit={handleAuth} className="space-y-4">
          <input
            type="email"
            placeholder="Email"
            className="w-full border p-2 rounded placeholder-zinc-500"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="Password"
            className="w-full border p-2 rounded placeholder-zinc-500"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
          />
          <div className="flex items-center">
            <input
              type="checkbox"
              id="remember"
              checked={rememberMe}
              onChange={e => setRememberMe(e.target.checked)}
              className="h-4 w-4 text-blue-600 border-zinc-300 rounded focus:ring-blue-500"
            />
            <label htmlFor="remember" className="ml-2 block text-sm text-zinc-600">
              Remember me
            </label>
          </div>
          {error && <div className="text-red-500 text-sm">{error}</div>}
          {success && <div className="text-green-500 text-sm">{success}</div>}
          <button
            type="submit"
            className="w-full bg-blue-500 text-white py-2 rounded hover:bg-blue-600 transition-colors"
            disabled={loading}
          >
            {loading ? (tab === 'login' ? 'Logging in...' : 'Registering...') : (tab === 'login' ? 'Login' : 'Register')}
          </button>
        </form>
      </div>
    </div>
  );
}
