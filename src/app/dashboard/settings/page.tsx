"use client";

import { useContext, useState, useEffect } from 'react';
import { SidebarContext } from '../layout';
import NotificationSettings from '@/components/NotificationSettings';
import { createClient } from '@/utils/supabase/client';

interface Project {
  id: string;
  name: string;
  description: string | null;
  date_created: string;
}

export default function SettingsPage() {
  const { isSidebarOpen } = useContext(SidebarContext);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

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
      } catch (err) {
        console.error('Error deleting project:', err);
        setError(err instanceof Error ? err.message : 'An error occurred while deleting project');
      }
    }
  };

  return (
    <div className="flex flex-col">
      <div className={`sticky top-0 w-full h-full py-6 px-10 z-40 transition-shadow duration-200 ${!isSidebarOpen ? '' : ''}`}>
        <div className={`flex justify-between items-center pt-14 xl:pt-0`}>
          <div>
            <h1 className="text-2xl font-bold text-zinc-800">Settings</h1>
            <p className="text-zinc-600 mt-1">Manage your preferences and projects</p>
          </div>
        </div>
      </div>

      <div className="p-8 space-y-8">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-xl shadow-xl p-6 mb-8">
            <h2 className="text-xl font-semibold text-zinc-800 mb-4">Notification Settings</h2>
            <NotificationSettings />
          </div>

          <div className="bg-white rounded-xl shadow-xl p-6">
            <h2 className="text-xl font-semibold text-zinc-800 mb-4">Project Management</h2>
            {loading ? (
              <div className="text-zinc-600">Loading projects...</div>
            ) : error ? (
              <div className="text-red-500">{error}</div>
            ) : projects.length === 0 ? (
              <div className="text-zinc-600">No projects found</div>
            ) : (
              <div className="space-y-4">
                {projects.map((project) => (
                  <div key={project.id} className="flex items-center justify-between p-4 bg-zinc-50 rounded-lg">
                    <div>
                      <h3 className="font-medium text-zinc-800">{project.name}</h3>
                      {project.description && (
                        <p className="text-sm text-zinc-600 mt-1">{project.description}</p>
                      )}
                      <p className="text-xs text-zinc-500 mt-1">
                        Created on {new Date(project.date_created).toLocaleDateString()}
                      </p>
                    </div>
                    <button
                      onClick={() => handleDeleteProject(project.id)}
                      className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 