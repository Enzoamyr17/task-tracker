"use client";

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { useState, useEffect } from 'react';

interface Project {
  id: string;
  name: string;
  description: string | null;
  user_id: string;
  date_created: string;
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [newProject, setNewProject] = useState({ name: '', description: '' });
  const [error, setError] = useState<string | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      setIsLoading(true);
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError) throw new Error('Failed to get user: ' + userError.message);
      if (!user) throw new Error('No user found');

      const { data, error: fetchError } = await supabase
        .from('projects')
        .select('*')
        .eq('user_id', user.id)
        .order('date_created', { ascending: false });

      if (fetchError) throw new Error('Failed to fetch projects: ' + fetchError.message);
      setProjects(data || []);
    } catch (err) {
      console.error('Error fetching projects:', err);
      setError(err instanceof Error ? err.message : 'An error occurred while fetching projects');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  const handleAddProject = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setError(null);
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError) throw new Error('Failed to get user: ' + userError.message);
      if (!user) throw new Error('No user found');

      const { error: insertError } = await supabase
        .from('projects')
        .insert([
          {
            name: newProject.name,
            description: newProject.description || null,
            user_id: user.id
          }
        ]);

      if (insertError) throw new Error('Failed to add project: ' + insertError.message);

      // Reset form and close modal
      setNewProject({ name: '', description: '' });
      setIsProjectModalOpen(false);
      // Refresh projects list
      await fetchProjects();
    } catch (err) {
      console.error('Error adding project:', err);
      setError(err instanceof Error ? err.message : 'An error occurred while adding project');
    }
  };

  return (
    <div className="min-h-screen flex">
      <aside className="w-64 shadow-sidebar p-6 flex flex-col fixed h-screen bg-white">
        <h2 className="text-xl font-bold mb-8 text-zinc-800">Dashboard</h2>
        <nav className="flex flex-col gap-2 mb-10">
          <a 
            href="/dashboard" 
            className={`px-4 py-2 rounded font-semibold ${
              pathname === '/dashboard' && !searchParams.get('project') ? 'bg-blue-500 text-white' : ''
            }`}
          >
            Tasks
          </a>
          <a 
            href="/dashboard/history" 
            className={`px-4 py-2 rounded font-semibold ${
              pathname === '/dashboard/history' ? 'bg-blue-500 text-white' : ''
            }`}
          >
            History
          </a>
        </nav>
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-zinc-800">Projects</h2>
            <button
              onClick={() => setIsProjectModalOpen(true)}
              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
          <nav className="flex flex-col gap-2">
            {isLoading ? (
              <div className="text-zinc-500 text-sm">Loading projects...</div>
            ) : projects.length === 0 ? (
              <div className="text-zinc-500 text-sm">No projects yet</div>
            ) : (
              projects.map((project) => (
                <a
                  key={project.id}
                  href={`/dashboard?project=${project.id}`}
                  className={`px-4 py-2 rounded font-semibold text-sm truncate hover:bg-zinc-100 transition-colors ${
                    pathname === '/dashboard' && searchParams.get('project') === project.id ? 'bg-blue-500 text-white hover:bg-blue-600' : ''
                  }`}
                  title={project.name}
                >
                  {project.name}
                </a>
              ))
            )}
          </nav>
        </div>
        <div className="mt-auto">
          <button
            onClick={handleLogout}
            className="w-full px-4 py-2 text-red-600 hover:bg-red-50 rounded font-semibold transition-colors flex items-center gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 001 1h12a1 1 0 001-1V4a1 1 0 00-1-1H3zm11 4a1 1 0 10-2 0v4a1 1 0 102 0V7zm-3 1a1 1 0 10-2 0v3a1 1 0 102 0V8zM8 9a1 1 0 00-2 0v3a1 1 0 102 0V9z" clipRule="evenodd" />
            </svg>
            Logout
          </button>
        </div>
      </aside>
      <main className="flex-1 bg-zinc-100 ml-64">{children}</main>

      {/* Add Project Modal */}
      {isProjectModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-zinc-800">Add New Project</h2>
              <button 
                onClick={() => setIsProjectModalOpen(false)}
                className="text-zinc-500 hover:text-zinc-700"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleAddProject} className="space-y-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-zinc-700 mb-1">Project Name</label>
                <input
                  type="text"
                  id="name"
                  value={newProject.name}
                  onChange={(e) => setNewProject({...newProject, name: e.target.value})}
                  className="w-full border border-zinc-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label htmlFor="description" className="block text-sm font-medium text-zinc-700 mb-1">Description</label>
                <textarea
                  id="description"
                  value={newProject.description}
                  onChange={(e) => setNewProject({...newProject, description: e.target.value})}
                  className="w-full border border-zinc-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                />
              </div>
              {error && (
                <div className="text-red-600 text-sm">{error}</div>
              )}
              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setIsProjectModalOpen(false)}
                  className="px-4 py-2 text-zinc-700 hover:bg-zinc-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                >
                  Add Project
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
} 