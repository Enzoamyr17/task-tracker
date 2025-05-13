"use client";

import { useState, useEffect, useContext } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useRouter, useSearchParams } from 'next/navigation';
import { SidebarContext } from './layout';
import TaskViewModal from '@/components/TaskViewModal';
import { Task } from '@/types/task';
import NotificationSettings from '@/components/NotificationSettings';
import { formatDate, formatDateOnly, getCurrentDateTime, isOverdue, isDueToday } from '@/utils/date';
import AddTaskModal from '@/components/AddTaskModal';

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
    due_date: `${getCurrentDate()}T23:59`,
    start_time: null,
    end_time: null,
    project_id: null,
    priority: 'medium',
    is_completed: false,
    is_recurring: false,
    recurrence_pattern: null,
    recurrence_end_date: null
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editedTask, setEditedTask] = useState<Task | null>(null);
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [hasSelectedTime, setHasSelectedTime] = useState(false);
  const [hasTimeTracking, setHasTimeTracking] = useState(false);

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
        is_completed: false,
        start_time: null,
        end_time: null,
        is_recurring: false,
        recurrence_pattern: null,
        recurrence_end_date: null
      });
      setHasSelectedTime(false);
      setHasTimeTracking(false);
      
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

  const handleAddTask = async (task: NewTask) => {
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

      console.log('Task to submit:', task);
      // Ensure due_date is correctly formatted
      const datePart = task.due_date?.slice(0, 10);
      const timePart = task.due_date?.slice(11) || '23:59';
      const taskToSubmit = {
        ...task,
        due_date: `${datePart}T${timePart}`,
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
        is_completed: false,
        start_time: null,
        end_time: null,
        is_recurring: false,
        recurrence_pattern: null,
        recurrence_end_date: null
      });
      setHasSelectedTime(false);
      setHasTimeTracking(false);
      
      // Refresh tasks immediately after adding
      await fetchTasks();
    } catch (err) {
      console.error('Error in handleAddTask:', err);
      setError(err instanceof Error ? err.message : 'An error occurred while adding task');
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
                is_completed: false,
                start_time: null,
                end_time: null,
                is_recurring: false,
                recurrence_pattern: null,
                recurrence_end_date: null
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
      <AddTaskModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleAddTask}
        projects={projects}
        projectId={projectId}
      />

      {/* View Task Modal */}
      {selectedTask && (
        <TaskViewModal
          task={selectedTask}
          isOpen={isViewModalOpen}
          onClose={() => {
            setIsViewModalOpen(false);
            setSelectedTask(null);
          }}
          onDelete={handleDelete}
        />
      )}


      {/* Sections */}
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