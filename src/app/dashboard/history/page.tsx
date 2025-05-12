"use client";

import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';
import { formatDate } from '@/utils/date';

interface Task {
  id: string;
  task: string;
  description: string | null;
  due_date: string | null;
  date_created: string;
  project_id: string | null;
  user_id: string;
  priority: 'low' | 'medium' | 'high';
  is_completed: boolean;
  projects?: {
    name: string;
  } | null;
}

export default function HistoryPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError) throw new Error('Failed to get user: ' + userError.message);
      if (!user) throw new Error('No user found');

      const { data, error: fetchError } = await supabase
        .from('tasks')
        .select(`
          *,
          projects (
            name
          )
        `)
        .eq('user_id', user.id)
        .eq('is_completed', true)
        .order('date_created', { ascending: false });

      if (fetchError) throw new Error('Failed to fetch tasks: ' + fetchError.message);
      setTasks(data || []);
    } catch (err) {
      console.error('Error fetching tasks:', err);
      setError(err instanceof Error ? err.message : 'An error occurred while fetching tasks');
    } finally {
      setLoading(false);
    }
  };

  const handleUncomplete = async (taskId: string) => {
    try {
      const { error: updateError } = await supabase
        .from('tasks')
        .update({ is_completed: false })
        .eq('id', taskId);

      if (updateError) throw new Error('Failed to update task: ' + updateError.message);

      setTasks(tasks.filter(task => task.id !== taskId));
    } catch (err) {
      console.error('Error updating task:', err);
      setError(err instanceof Error ? err.message : 'An error occurred while updating task');
    }
  };

  const handleDelete = async (taskId: string) => {
    try {
      const { error: deleteError } = await supabase
        .from('tasks')
        .delete()
        .eq('id', taskId);

      if (deleteError) throw new Error('Failed to delete task: ' + deleteError.message);

      setTasks(tasks.filter(task => task.id !== taskId));
    } catch (err) {
      console.error('Error deleting task:', err);
      setError(err instanceof Error ? err.message : 'An error occurred while deleting task');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-zinc-600">Loading tasks...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-red-600">Error: {error}</div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-zinc-800">Completed Tasks</h1>
      </div>

      <div className="mb-8">
        <h2 className="text-2xl font-bold text-zinc-800 mb-2">Task History</h2>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-blue-700">
          <p className="font-medium mb-1">Note about task cleanup:</p>
          <p>Completed tasks that are older than 30 days will be automatically deleted to keep your task history clean and efficient.</p>
        </div>
      </div>

      <div className="grid gap-4">
        {tasks.length === 0 ? (
          <div className="text-zinc-500 text-center py-8">No completed tasks yet</div>
        ) : (
          tasks.map(task => (
            <div 
              key={task.id}
              className="bg-white rounded-lg p-4 shadow-sm border border-zinc-200"
            >
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={task.is_completed}
                    onChange={() => handleUncomplete(task.id)}
                    className="w-4 h-4 text-blue-600 border-zinc-300 rounded focus:ring-blue-500 cursor-pointer"
                  />
                  <div>
                    <h4 className="font-semibold text-zinc-800">{task.task}</h4>
                    {task.projects && (
                      <span className="text-sm text-blue-600">
                        Project: {task.projects.name}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    task.priority === 'high' ? 'bg-red-100 text-red-700' :
                    task.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-green-100 text-green-700'
                  }`}>
                    {task.priority}
                  </span>
                  <button
                    onClick={() => {
                      if (window.confirm('Are you sure you want to delete this task?')) {
                        handleDelete(task.id);
                      }
                    }}
                    className="text-red-600 hover:text-red-700 p-2 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
              </div>
              {task.description && (
                <p className="text-sm text-zinc-600 mb-2">{task.description}</p>
              )}
              <div className="flex items-center gap-4 text-xs text-zinc-500">
                <span>Completed: {formatDate(task.date_created)}</span>
                {task.due_date && (
                  <span>Due: {formatDate(task.due_date)}</span>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
} 