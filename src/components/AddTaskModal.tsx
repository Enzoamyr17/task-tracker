import { useState } from 'react';
import { Task } from '@/types/task';
import { getCurrentDateTime } from '@/utils/date';

type NewTask = Omit<Task, 'id' | 'date_created' | 'user_id'>;

const getCurrentDate = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

interface AddTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (task: NewTask) => void;
  projects: { id: string; name: string }[];
  projectId: string | null;
}

export default function AddTaskModal({ isOpen, onClose, onSubmit, projects, projectId }: AddTaskModalProps) {
  const [newTask, setNewTask] = useState<NewTask>({
    task: '',
    description: '',
    due_date: `${getCurrentDateTime()}`,
    start_time: null,
    end_time: null,
    project_id: projectId,
    priority: 'medium',
    is_completed: false,
    is_recurring: false,
    recurrence_pattern: null,
    recurrence_end_date: null
  });
  const [hasSelectedTime, setHasSelectedTime] = useState(false);
  const [hasTimeTracking, setHasTimeTracking] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Ensure due_date has 23:59 if no time is specified
    const datePart = newTask.due_date ? newTask.due_date.slice(0, 10) : getCurrentDate();
    const timePart = hasSelectedTime && newTask.due_date ? newTask.due_date.slice(11) : '23:59';
    const taskToSubmit = {
      ...newTask,
      due_date: `${datePart}T${timePart}`
    };
    onSubmit(taskToSubmit);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-30 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md overflow-y-auto max-h-[90vh] border border-zinc-100 shadow-md">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-zinc-800">Add New Task</h2>
          <button 
            onClick={onClose}
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
              rows={2}
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
                    setNewTask({ ...newTask, due_date: `${dateValue}` });
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

          {/* Time tracking */}
          {/* Add to calendar */}
          <div className="space-y-4">
            <div className="flex items-center mb-4">
              <input
                type="checkbox"
                id="time_tracking"
                checked={hasTimeTracking}
                onChange={(e) => setHasTimeTracking(e.target.checked)}
                className="h-4 w-4 text-blue-600 border-zinc-300 rounded focus:ring-blue-500"
              />
              <label htmlFor="time_tracking" className="ml-2 block text-sm text-zinc-600">
                Add to Calendar
              </label>
            </div>

            {hasTimeTracking && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="start_time" className="block text-sm font-medium text-zinc-700 mb-1">Start Time</label>
                  <input
                    type="datetime-local"
                    id="start_time"
                    value={newTask.start_time || ''}
                    onChange={(e) => setNewTask({...newTask, start_time: e.target.value})}
                    className="w-full border border-zinc-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label htmlFor="end_time" className="block text-sm font-medium text-zinc-700 mb-1">End Time</label>
                  <input
                    type="datetime-local"
                    id="end_time"
                    value={newTask.end_time || ''}
                    onChange={(e) => setNewTask({...newTask, end_time: e.target.value})}
                    className="w-full border border-zinc-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Priority */}
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
          <div className="flex items-center mb-4">
            <input
              type="checkbox"
              id="is_recurring"
              checked={newTask.is_recurring}
              onChange={(e) => setNewTask({...newTask, is_recurring: e.target.checked})}
              className="h-4 w-4 text-blue-600 border-zinc-300 rounded focus:ring-blue-500"
            />
            <label htmlFor="is_recurring" className="ml-2 block text-sm text-zinc-600">
              Recurring task
            </label>
          </div>

          {newTask.is_recurring && (
            <div className="space-y-4">
              <div>
                <label htmlFor="recurrence_pattern" className="block text-sm font-medium text-zinc-700 mb-1">
                  Frequency
                </label>
                <select
                  id="recurrence_pattern"
                  value={newTask.recurrence_pattern || ''}
                  onChange={(e) => setNewTask({...newTask, recurrence_pattern: e.target.value as 'daily' | 'weekly' | 'monthly' | 'yearly' | null})}
                  className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select frequency</option>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="yearly">Yearly</option>
                </select>
              </div>
              <div>
                <label htmlFor="recurrence_end_date" className="block text-sm font-medium text-zinc-700 mb-1">
                  End Date
                </label>
                <input
                  type="date"
                  id="recurrence_end_date"
                  value={newTask.recurrence_end_date || ''}
                  onChange={(e) => setNewTask({...newTask, recurrence_end_date: e.target.value})}
                  className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          )}

          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
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
  );
} 