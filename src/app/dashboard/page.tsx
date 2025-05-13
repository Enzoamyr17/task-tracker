"use client";

import { useState, useEffect, useContext } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useRouter, useSearchParams } from 'next/navigation';
import { SidebarContext } from './layout';
import NotificationSettings from '@/components/NotificationSettings';
import { formatDate, formatDateOnly, getCurrentDateTime, isOverdue, isDueToday } from '@/utils/date';

// ... existing code ...

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

interface Project {
  id: string;
  name: string;
  description: string | null;
  user_id: string;
  date_created: string;
}

type NewTask = Omit<Task, 'id' | 'date_created' | 'user_id'>;

const getCurrentDate = () => {
  const today = new Date();
  return today.toISOString().split('T')[0];
};

export default function DashboardPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const projectId = searchParams.get('project');
  const { isSidebarOpen } = useContext(SidebarContext);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newTask, setNewTask] = useState<NewTask>({
    task: '',
    description: '',
    due_date: `${getCurrentDateTime()}T23:59`,
    project_id: null,
    priority: 'medium',
    is_completed: false
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editedTask, setEditedTask] = useState<Task | null>(null);
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [hasSelectedTime, setHasSelectedTime] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        setLoading(true);
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('Session error:', sessionError);
          router.push('/');
          return;
        }

        if (!session) {
          console.log('No session found, redirecting to login');
          router.push('/');
          return;
        }

        setIsAuthenticated(true);
        await Promise.all([
          fetchTasks(),
          fetchProjects(),
          projectId ? fetchProjectDetails() : Promise.resolve()
        ]);
      } catch (err) {
        console.error('Auth error:', err);
        setError(err instanceof Error ? err.message : 'Authentication failed');
        router.push('/');
      } finally {
        setLoading(false);
      }
    };

    checkAuth();

    // Subscribe to auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        router.push('/');
      }
    });

    // Subscribe to real-time changes
    const channel = supabase
      .channel('tasks_changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'tasks' },
        async () => {
          await fetchTasks();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      subscription.unsubscribe();
    };
  }, [projectId]);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 26);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const fetchProjectDetails = async () => {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw new Error('Failed to get user: ' + userError.message);
      if (!user) throw new Error('No user found');

      const { data, error: fetchError } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .eq('user_id', user.id)
        .single();

      if (fetchError) throw new Error('Failed to fetch project: ' + fetchError.message);
      setCurrentProject(data);
    } catch (err) {
      console.error('Error fetching project:', err);
      setError(err instanceof Error ? err.message : 'An error occurred while fetching project');
    }
  };

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError) throw new Error('Failed to get user: ' + userError.message);
      if (!user) throw new Error('No user found');

      let query = supabase
        .from('tasks')
        .select(`
          *,
          projects (
            name
          )
        `)
        .eq('user_id', user.id)
        .eq('is_completed', false);

      if (projectId) {
        query = query.eq('project_id', projectId);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw new Error('Failed to fetch tasks: ' + fetchError.message);
      setTasks(data || []);
    } catch (err) {
      console.error('Error fetching tasks:', err);
      setError(err instanceof Error ? err.message : 'An error occurred while fetching tasks');
    } finally {
      setLoading(false);
    }
  };

  const fetchProjects = async () => {
    try {
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
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setError(null);
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError) {
        console.error('User error:', userError);
        throw new Error('Failed to get user: ' + userError.message);
      }
      
      if (!user) {
        console.error('No user found');
        throw new Error('No user found');
      }

      // Ensure due_date has 23:59 if no time is specified
      const taskToSubmit = {
        ...newTask,
        due_date: newTask.due_date?.includes('T') ? newTask.due_date : `${newTask.due_date}T23:59`,
        user_id: user.id
      };

      const { data, error: insertError } = await supabase
        .from('tasks')
        .insert([taskToSubmit])
        .select();

      if (insertError) {
        console.error('Insert error:', insertError);
        throw new Error('Failed to add task: ' + insertError.message);
      }

      console.log('Task added successfully:', data);
      setIsModalOpen(false);
      setNewTask({ 
        task: '', 
        description: '', 
        due_date: `${getCurrentDate()}T23:59`,
        project_id: null,
        priority: 'medium',
        is_completed: false
      });
      setHasSelectedTime(false);
      
      // Refresh tasks immediately after adding
      await fetchTasks();
    } catch (err) {
      console.error('Error in handleSubmit:', err);
      setError(err instanceof Error ? err.message : 'An error occurred while adding task');
    }
  };

  const handleTaskComplete = async (taskId: string, completed: boolean) => {
    try {
      const { error: updateError } = await supabase
        .from('tasks')
        .update({
          is_completed: completed
        })
        .eq('id', taskId);

      if (updateError) {
        throw new Error('Failed to update task: ' + updateError.message);
      }

      // Update the task in the local state
      setTasks(tasks.map(task => 
        task.id === taskId 
          ? { ...task, is_completed: completed }
          : task
      ));
    } catch (err) {
      console.error('Error updating task:', err);
      setError(err instanceof Error ? err.message : 'An error occurred while updating task');
    }
  };

  const categorizeTasks = () => {
    console.log('Categorizing tasks:', tasks);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Helper function to get priority weight
    const getPriorityWeight = (priority: 'low' | 'medium' | 'high') => {
      switch (priority) {
        case 'high': return 3;
        case 'medium': return 2;
        case 'low': return 1;
        default: return 0;
      }
    };

    // Helper function to sort tasks by priority
    const sortByPriority = (a: Task, b: Task) => {
      return getPriorityWeight(b.priority) - getPriorityWeight(a.priority);
    };

    const categorized = tasks.reduce((acc, task) => {
      // Skip completed tasks
      if (task.is_completed) {
        return acc;
      }

      if (!task.due_date) {
        acc.upcoming.push(task);
        return acc;
      }

      if (isOverdue(task.due_date)) {
        acc.overdue.push(task);
      } else if (isDueToday(task.due_date)) {
        acc.today.push(task);
      } else {
        acc.upcoming.push(task);
      }
      return acc;
    }, { overdue: [] as Task[], today: [] as Task[], upcoming: [] as Task[] });

    // Sort each category by priority
    categorized.overdue.sort(sortByPriority);
    categorized.today.sort(sortByPriority);
    categorized.upcoming.sort(sortByPriority);

    console.log('Categorized and sorted tasks:', categorized);
    return categorized;
  };

  const { overdue, today, upcoming } = categorizeTasks();

  const TaskCard = ({ task }: { task: Task }) => {
    const [isCompleting, setIsCompleting] = useState(false);

    const handleComplete = async (e: React.ChangeEvent<HTMLInputElement>) => {
      e.stopPropagation();
      const newCompletedState = e.target.checked;
      
      // Update the task state immediately
      handleTaskComplete(task.id, newCompletedState);
      
      // Then start the animation
      setIsCompleting(true);
    };

    return (
      <div 
        className="bg-white rounded-lg p-4 shadow-sm border border-zinc-200 hover:shadow-md transition-shadow cursor-pointer"
        onClick={() => {
          setSelectedTask(task);
          setIsViewModalOpen(true);
        }}
      >
        <div className="flex justify-between items-start mb-2 min-w-0">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <input
              type="checkbox"
              checked={task.is_completed}
              onChange={handleComplete}
              className="w-4 h-4 text-blue-600 border-zinc-300 rounded focus:ring-blue-500 cursor-pointer flex-shrink-0"
              onClick={(e) => e.stopPropagation()}
            />
            <h4 className={`font-semibold text-zinc-800 truncate transition-colors duration-300 ${
              isCompleting ? 'text-green-600' : ''
            }`}>{task.task}</h4>
          </div>
          <span className={`px-2 py-1 rounded text-xs font-medium flex-shrink-0 ml-2 ${
            task.priority === 'high' ? 'bg-red-100 text-red-700' :
            task.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
            'bg-green-100 text-green-700'
          }`}>
            {task.priority}
          </span>
        </div>
        {task.description && (
          <p className={`text-sm text-zinc-600 mb-2 line-clamp-2 transition-colors duration-300 ${
            isCompleting ? 'text-green-600' : ''
          }`}>{task.description}</p>
        )}
        {task.due_date && (
          <div className="text-xs text-zinc-500 mt-auto">
            Due: {new Date(task.due_date).toLocaleString('en-US', {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
              hour12: true
            })}
          </div>
        )}
      </div>
    );
  };

  const handleModalClose = async () => {
    if (editedTask) {
      try {
        setError(null);
        // If the date doesn't have a time component, keep it as date-only
        const dueDate = editedTask.due_date?.length === 10 ? editedTask.due_date : editedTask.due_date;
        
        const { error: updateError } = await supabase
          .from('tasks')
          .update({
            due_date: dueDate,
            priority: editedTask.priority
          })
          .eq('id', editedTask.id);

        if (updateError) {
          throw new Error('Failed to update task: ' + updateError.message);
        }

        // Update the task in the local state
        setTasks(tasks.map(task => 
          task.id === editedTask.id ? { ...task, due_date: dueDate } : task
        ));
      } catch (err) {
        console.error('Error updating task:', err);
        setError(err instanceof Error ? err.message : 'An error occurred while updating task');
      }
    }
    setIsViewModalOpen(false);
    setEditedTask(null);
  };

  const handleDelete = async (taskId: string) => {
    try {
      const { error: deleteError } = await supabase
        .from('tasks')
        .delete()
        .eq('id', taskId);

      if (deleteError) {
        throw new Error('Failed to delete task: ' + deleteError.message);
      }

      // Update the task in the local state
      setTasks(tasks.filter(task => task.id !== taskId));
      setIsViewModalOpen(false);
      setSelectedTask(null);
    } catch (err) {
      console.error('Error deleting task:', err);
      setError(err instanceof Error ? err.message : 'An error occurred while deleting task');
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-zinc-600">Authenticating...</div>
      </div>
    );
  }

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
    <div className="flex flex-col">
      <div className={`sticky top-0 w-full h-full py-6 px-10 z-40 transition-shadow duration-200 ${isScrolled ? 'shadow-xl bg-zinc-100' : ''} ${!isSidebarOpen ? '' : ''}`}>
        <div className={`flex justify-between items-center pt-14 xl:pt-0`}>
          <div>
            <h1 className="text-2xl font-bold text-zinc-800">
              {currentProject ? currentProject.name : 'Tasks'}
            </h1>
            {currentProject?.description && (
              <p className="text-zinc-600 mt-1">{currentProject.description}</p>
            )}
          </div>
          <button 
            onClick={() => {
              setNewTask({
                task: '',
                description: '',
                due_date: `${getCurrentDate()}T23:59`,
                project_id: projectId || null,
                priority: 'medium',
                is_completed: false
              });
              setIsModalOpen(true);
            }}
            className={`bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors flex items-center gap-2 w-[140px] justify-center ${isSidebarOpen ? 'hidden md:flex' : ''}`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
            </svg>
            Add Task
          </button>
        </div>
      </div>

      {/* Add Task Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-zinc-800">Add New Task</h2>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-zinc-500 hover:text-zinc-700"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="task" className="block text-sm font-medium text-zinc-700 mb-1">
                  Task Name
                </label>
                <input
                  type="text"
                  id="task"
                  value={newTask.task}
                  onChange={(e) => setNewTask({ ...newTask, task: e.target.value })}
                  className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label htmlFor="description" className="block text-sm font-medium text-zinc-700 mb-1">
                  Description
                </label>
                <textarea
                  id="description"
                  value={newTask.description || ''}
                  onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                  className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                />
              </div>
              <div>
                <div className="flex gap-2">
                  <div className="m-auto w-1/2">
                    <label htmlFor="due_date" className="block text-sm font-medium text-zinc-700 mb-1">
                      Due Date
                    </label>
                    <input
                      type="date"
                      id="due_date"
                      value={newTask.due_date ? newTask.due_date.slice(0, 10) : getCurrentDate()}
                      onChange={(e) => {
                        const dateValue = e.target.value;
                        setNewTask({ ...newTask, due_date: `${dateValue}T23:59` });
                      }}
                      className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="m-auto w-1/2">
                    <label htmlFor="due_time" className="block text-sm font-medium text-zinc-700 mb-1">
                      Due Time (Optional)
                    </label>
                    <input
                      type="time"
                      id="due_time"
                      value={hasSelectedTime ? newTask.due_date?.slice(11, 16) : ''}
                      onChange={(e) => {
                        const timeValue = e.target.value;
                        const dateValue = newTask.due_date?.slice(0, 10) || getCurrentDate();
                        setNewTask({ ...newTask, due_date: `${dateValue}T${timeValue || '23:59'}` });
                        setHasSelectedTime(!!timeValue);
                      }}
                      className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                
              </div>
              <div>
                <label htmlFor="priority" className="block text-sm font-medium text-zinc-700 mb-1">
                  Priority
                </label>
                <select
                  id="priority"
                  value={newTask.priority}
                  onChange={(e) => setNewTask({ ...newTask, priority: e.target.value as 'low' | 'medium' | 'high' })}
                  className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
              <div>
                <label htmlFor="project" className="block text-sm font-medium text-zinc-700 mb-1">
                  Project
                </label>
                <select
                  id="project"
                  value={newTask.project_id || ''}
                  onChange={(e) => setNewTask({ ...newTask, project_id: e.target.value || null })}
                  className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">No Project</option>
                  {projects.map(project => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </select>
              </div>
              {projectId && (
                <input
                  type="hidden"
                  value={projectId}
                  onChange={(e) => setNewTask({ ...newTask, project_id: e.target.value })}
                />
              )}
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-zinc-700 hover:bg-zinc-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Add Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Task Modal */}
      {isViewModalOpen && selectedTask && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={() => {
            setIsViewModalOpen(false);
            setSelectedTask(null);
            setEditedTask(null);
          }}
        >
          <div 
            className="bg-white rounded-lg p-6 w-full max-w-md"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-zinc-800">{selectedTask.task}</h2>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => {
                    if (window.confirm('Are you sure you want to delete this task?')) {
                      handleDelete(selectedTask.id);
                    }
                  }}
                  className="text-red-600 hover:text-red-700 p-2 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </button>
                <button 
                  onClick={() => {
                    setIsViewModalOpen(false);
                    setSelectedTask(null);
                    setEditedTask(null);
                  }}
                  className="text-zinc-500 hover:text-zinc-700"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <select
                  id="priority"
                  value={editedTask?.priority || selectedTask.priority}
                  onChange={(e) => setEditedTask(prev => prev ? {...prev, priority: e.target.value as 'low' | 'medium' | 'high'} : {...selectedTask, priority: e.target.value as 'low' | 'medium' | 'high'})}
                  className={`w-auto rounded-full text-xs font-medium px-3 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    (editedTask?.priority || selectedTask.priority) === 'high' ? 'bg-red-100 text-red-700 border-red-200' :
                    (editedTask?.priority || selectedTask.priority) === 'medium' ? 'bg-yellow-100 text-yellow-700 border-yellow-200' :
                    'bg-green-100 text-green-700 border-green-200'
                  }`}
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
              
              {selectedTask.description && (
                <div>
                  <p className="text-zinc-600 whitespace-pre-wrap">{selectedTask.description}</p>
                </div>
              )}

              <div className="flex items-center gap-4 text-sm text-zinc-600">
                <div className='m-auto'>
                  <span className="font-medium text-zinc-700">Created: </span>
                  {formatDate(selectedTask.date_created)}
                </div>
                <div className='m-auto'>
                  <label htmlFor="due_date" className="font-medium text-zinc-700">Due: </label>
                  <div className="flex gap-2">
                    <input
                      type="date"
                      id="due_date"
                      value={editedTask?.due_date ? editedTask.due_date.slice(0, 10) : 
                             selectedTask.due_date ? selectedTask.due_date.slice(0, 10) : getCurrentDate().slice(0, 10)}
                      onChange={(e) => {
                        const dateValue = e.target.value;
                        const timeValue = editedTask?.due_date?.slice(11, 16) || selectedTask.due_date?.slice(11, 16) || '23:59';
                        setEditedTask(prev => prev ? {...prev, due_date: `${dateValue}T${timeValue}`} : {...selectedTask, due_date: `${dateValue}T${timeValue}`});
                      }}
                      className="w-auto rounded-full text-xs text-zinc-600 px-3 py-1 border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <input
                      type="time"
                      id="due_time"
                      value={editedTask?.due_date?.slice(11, 16) || selectedTask.due_date?.slice(11, 16) || ''}
                      onChange={(e) => {
                        const timeValue = e.target.value;
                        const dateValue = editedTask?.due_date?.slice(0, 10) || selectedTask.due_date?.slice(0, 10) || getCurrentDate();
                        setEditedTask(prev => prev ? {...prev, due_date: `${dateValue}T${timeValue || '23:59'}`} : {...selectedTask, due_date: `${dateValue}T${timeValue || '23:59'}`});
                      }}
                      className="w-auto rounded-full text-xs text-zinc-600 px-3 py-1 border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col md:flex-row gap-6 p-8">
        <section className="w-full md:w-1/3 bg-card rounded-xl shadow-xl p-4">
          <h3 className="text-lg font-bold mb-4 text-blue-600">Today</h3>
          {today.length === 0 ? (
            <div className="text-zinc-500 text-sm">No tasks for today</div>
          ) : (
            today.map(task => <TaskCard key={task.id} task={task} />)
          )}
        </section>
        <section className="w-full md:w-1/3 bg-card rounded-xl shadow-xl p-4">
          <h3 className="text-lg font-bold mb-4 text-green-600">Upcoming</h3>
          {upcoming.length === 0 ? (
            <div className="text-zinc-500 text-sm">No upcoming tasks</div>
          ) : (
            upcoming.map(task => <TaskCard key={task.id} task={task} />)
          )}
        </section>
        <section className="w-full md:w-1/3 bg-card rounded-xl shadow-xl p-4">
          <h3 className="text-lg font-bold mb-4 text-red-600">Overdue</h3>
          {overdue.length === 0 ? (
            <div className="text-zinc-500 text-sm">No overdue tasks</div>
          ) : (
            overdue.map(task => <TaskCard key={task.id} task={task} />)
          )}
        </section>
      </div>
    </div>
  );
} 