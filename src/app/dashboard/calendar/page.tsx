"use client";

import { useState, useEffect, useContext } from 'react';
import { createClient } from '@/utils/supabase/client';
import { SidebarContext } from '../layout';
import { Calendar, dateFnsLocalizer, Event, View } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { formatDate, formatDateOnly, getCurrentDateTime } from '@/utils/date';
import TaskViewModal from '@/components/TaskViewModal';
import { Task } from '@/types/task';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import AddTaskModal from '@/components/AddTaskModal';

interface Project {
  id: string;
  name: string;
  description: string | null;
  user_id: string;
  date_created: string;
}

const getCurrentDate = () => {
  const today = new Date();
  return today.toISOString().split('T')[0];
};

const locales = {
  'en-US': require('date-fns/locale/en-US'),
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

interface CalendarEvent extends Event {
  resource: Task;
}

type NewTask = Omit<Task, 'id' | 'date_created' | 'user_id'>;

export default function CalendarPage() {
  const { isSidebarOpen } = useContext(SidebarContext);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<View>('week');
  const [date, setDate] = useState(new Date());
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [hasSelectedTime, setHasSelectedTime] = useState(false);
  const [hasTimeTracking, setHasTimeTracking] = useState(false);
  const [newTask, setNewTask] = useState<NewTask>({
    task: '',
    description: '',
    due_date: `${getCurrentDateTime()}T23:59`,
    project_id: null,
    priority: 'medium',
    is_completed: false,
    start_time: null,
    end_time: null,
    is_recurring: false,
    recurrence_pattern: null,
    recurrence_end_date: null
  });
  const projectId = null; // Define or pass this as needed
  const supabase = createClient();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 26);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    try {
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
        .not('start_time', 'is', null)
        .not('end_time', 'is', null);

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

  useEffect(() => {
    fetchProjects();
  }, []);

  // Convert tasks to calendar events
  const events: CalendarEvent[] = tasks.map(task => ({
    id: task.id,
    title: task.task,
    start: new Date(task.start_time!),
    end: new Date(task.end_time!),
    resource: task,
  }));

  const handleDelete = async (taskId: string) => {
    try {
      const { error: deleteError } = await supabase
        .from('tasks')
        .delete()
        .eq('id', taskId);

      if (deleteError) {
        throw new Error('Failed to delete task: ' + deleteError.message);
      }

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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-zinc-600">Loading calendar...</div>
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
              Calendar
            </h1>
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

      <div className="p-0 md:p-6">
        <div className="bg-white w-full md:w-[95%] md:rounded-lg shadow-md p-4">
          <div className="h-[700px]">
            <Calendar
              localizer={localizer}
              events={events}
              startAccessor="start"
              endAccessor="end"
              style={{ height: '100%' }}
              views={['month', 'week', 'day']}
              view={view}
              onView={(newView) => setView(newView)}
              date={date}
              onNavigate={(newDate) => setDate(newDate)}
              defaultView="week"
              eventPropGetter={(event: CalendarEvent) => ({
                style: {
                  backgroundColor: event.resource.priority === 'high' ? '#fee2e2' : // bg-red-100
                                   event.resource.priority === 'medium' ? '#fef3c7' : // bg-yellow-100
                                   '#d1fae5', // bg-green-100
                  color: event.resource.priority === 'high' ? '#b91c1c' : // text-red-700
                         event.resource.priority === 'medium' ? '#b45309' : // text-yellow-700
                         '#047857', // text-green-700
                  borderRadius: '5px',
                  border: 'none',
                },
                className: 'cursor-pointer'
              })}
              tooltipAccessor={(event: CalendarEvent): string => {
                const description = event.resource.description;
                const title = event.title;
                return (description || title || '') as string;
              }}
              onSelectEvent={(event: CalendarEvent) => {
                setSelectedTask(event.resource);
                setIsViewModalOpen(true);
              }}
            />
          </div>
        </div>
      </div>

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

      {/* Add Task Modal */}
      <AddTaskModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleAddTask}
        projects={projects}
        projectId={projectId}
      />

    </div>
  );
} 