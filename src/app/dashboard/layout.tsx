"use client";

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { useState, useEffect, createContext, useContext, Suspense } from 'react';
import Link from 'next/link';

interface Project {
  id: string;
  name: string;
  description: string | null;
  user_id: string;
  date_created: string;
}

// Create context for sidebar state
interface SidebarContextType {
  isSidebarOpen: boolean;
  setIsSidebarOpen: (value: boolean) => void;
}

export const SidebarContext = createContext<SidebarContextType>({
  isSidebarOpen: true,
  setIsSidebarOpen: () => {},
});

function DashboardLayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [showOpenButton, setShowOpenButton] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newProject, setNewProject] = useState({ name: '', description: '' });
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Check if we're on smaller screen
    const isSmallScreen = window.innerWidth < 1200;
    setIsSidebarOpen(!isSmallScreen);
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 0);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (!isSidebarOpen) {
      const timer = setTimeout(() => {
        setShowOpenButton(true);
      }, 300);
      return () => clearTimeout(timer);
    } else {
      setShowOpenButton(false);
    }
  }, [isSidebarOpen]);

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      setLoading(true);
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
      setLoading(false);
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
            description: newProject.description,
            user_id: user.id
          }
        ]);

      if (insertError) throw new Error('Failed to add project: ' + insertError.message);

      setIsProjectModalOpen(false);
      setNewProject({ name: '', description: '' });
      await fetchProjects();
    } catch (err) {
      console.error('Error adding project:', err);
      setError(err instanceof Error ? err.message : 'An error occurred while adding project');
    }
  };

  const handleDeleteProject = async (projectId: string) => {
    if (window.confirm('Are you sure you want to delete this project? This action cannot be undone.')) {
      try {
        const { error: deleteError } = await supabase
          .from('projects')
          .delete()
          .eq('id', projectId);

        if (deleteError) throw new Error('Failed to delete project: ' + deleteError.message);

        // Refresh projects list
        await fetchProjects();
        
        // If we're currently viewing the deleted project, redirect to dashboard
        if (searchParams.get('project') === projectId) {
          router.push('/dashboard');
        }
      } catch (err) {
        console.error('Error deleting project:', err);
        setError(err instanceof Error ? err.message : 'An error occurred while deleting project');
      }
    }
  };

  if (!mounted) {
    return null;
  }

  return (
    <SidebarContext.Provider value={{ isSidebarOpen, setIsSidebarOpen }}>
      <div className="flex h-screen bg-zinc-50">
        {!isSidebarOpen && showOpenButton && (
          <button
            onClick={() => setIsSidebarOpen(true)}
            className={`fixed top-6 left-6 z-50 p-2 rounded-lg shadow-md transition-colors duration-200 ${
              isScrolled ? 'bg-transparent' : 'bg-white'
            }`}
          >
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              className="h-6 w-6 text-zinc-600"
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        )}
        <aside className={`fixed top-0 left-0 h-full w-64 bg-white shadow-lg transition-transform duration-300 ease-in-out ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } xl:translate-x-0`}>
          <div className="p-6 h-full flex flex-col">
            <div className="flex items-center justify-between mb-8">
              <h1 className="text-2xl font-bold text-zinc-800">Task Tracker</h1>
              <button
                onClick={() => setIsSidebarOpen(false)}
                className="p-2 rounded-lg hover:bg-zinc-100 transition-colors xl:hidden"
              >
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  className="h-6 w-6 text-zinc-600"
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <nav className="space-y-6 flex-1">
              <div>
                <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-wider mb-2">Navigation</h2>
                <div className="flex flex-col space-y-1">
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
                  <a 
                    href="/dashboard/settings" 
                    className={`px-4 py-2 rounded font-semibold ${
                      pathname === '/dashboard/settings' ? 'bg-blue-500 text-white' : ''
                    }`}
                  >
                    Settings
                  </a>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-wider">Projects</h2>
                  <button
                    onClick={() => setIsProjectModalOpen(true)}
                    className="p-1 hover:bg-blue-50 rounded-lg transition-colors"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-500" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
                <div className="space-y-1">
                  {loading ? (
                    <div className="text-sm text-zinc-500">Loading projects...</div>
                  ) : error ? (
                    <div className="text-sm text-red-500">{error}</div>
                  ) : projects.length === 0 ? (
                    <div className="text-sm text-zinc-500">No projects yet</div>
                  ) : (
                    projects.map(project => (
                      <div key={project.id} className="group relative">
                        <Link
                          href={`/dashboard?project=${project.id}`}
                          className={`block px-4 py-2 rounded font-semibold ${
                            searchParams.get('project') === project.id ? 'bg-blue-500 text-white' : ''
                          }`}
                        >
                          {project.name}
                        </Link>
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            handleDeleteProject(project.id);
                          }}
                          className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-red-500 opacity-0 group-hover:opacity-100 hover:bg-red-50 rounded transition-all duration-200"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </nav>

            <button
              onClick={handleLogout}
              className="mt-auto flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 001 1h12a1 1 0 001-1V4a1 1 0 00-1-1H3zm11 4a1 1 0 10-2 0v4a1 1 0 102 0V7zm-3 1a1 1 0 10-2 0v3a1 1 0 102 0V8zM8 9a1 1 0 00-2 0v2a1 1 0 102 0V9z" clipRule="evenodd" />
              </svg>
              Logout
            </button>
          </div>
        </aside>

        {/* Main Content */}
        <main className={`flex-1 transition-all duration-300 ${
          isSidebarOpen ? 'ml-64' : 'ml-0'
        } xl:ml-64`}>
          {children}
        </main>

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
    </SidebarContext.Provider>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-screen">
      <div className="text-zinc-600">Loading...</div>
    </div>}>
      <DashboardLayoutContent>{children}</DashboardLayoutContent>
    </Suspense>
  );
} 