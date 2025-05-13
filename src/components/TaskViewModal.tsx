import { Task } from '@/types/task';
import { formatDate, formatDateOnly } from '@/utils/date';

interface TaskViewModalProps {
  task: Task;
  isOpen: boolean;
  onClose: () => void;
  onDelete: (taskId: string) => void;
}

export default function TaskViewModal({ task, isOpen, onClose, onDelete }: TaskViewModalProps) {
  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-30 backdrop-blur-sm flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-lg p-6 w-full max-w-md shadow-md border border-zinc-100"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-start mb-6">
          <div className="flex-1">
            <h2 className="text-xl font-bold text-zinc-800 mb-1">{task.task}</h2>
            <div className="flex items-center gap-2">
              <span className={`px-2 py-1 rounded text-xs font-medium ${
                task.priority === 'high' ? 'bg-red-100 text-red-700' :
                task.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                'bg-green-100 text-green-700'
              }`}>Priority: {task.priority}
              </span>
              {task.is_recurring && (
                <span className="px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-700">
                  Recurring: {task.recurrence_pattern}{task.recurrence_end_date ? ` until ${formatDateOnly(task.recurrence_end_date)}` : ''}
                </span>
              )}
              {(task.start_time || task.end_time) && (
                <span className="px-2 py-1 rounded text-xs font-medium bg-purple-100 text-purple-700">
                  Time Blocked
                </span>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => {
                if (window.confirm('Are you sure you want to delete this task?')) {
                  onDelete(task.id);
                }
              }}
              className="text-red-600 hover:text-red-700 p-2 hover:bg-red-50 rounded-lg transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </button>
            <button 
              onClick={onClose}
              className="text-zinc-500 hover:text-zinc-700"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="space-y-4">
          {task.description && (
            <div className="rounded-lg p-4 border border-zinc-200 shadow-sm">
              <p className="text-zinc-600 whitespace-pre-wrap">{task.description}</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium text-zinc-700">Created: </span>
              <span className="text-zinc-600">{formatDate(task.date_created)}</span>
            </div>
            <div>
              <span className="font-medium text-zinc-700">Due: </span>
              <span className="text-zinc-600">
                {task.due_date ? formatDate(task.due_date) : 'No due date'}
              </span>
            </div>

            {(task.start_time || task.end_time) && (
              <div className="col-span-2">
                <h1 className="text-zinc-600"><span className='font-semibold'>Start time:</span> {task.start_time ? formatDate(task.start_time) : 'No start time'} 
                </h1>
                <h1 className="text-zinc-600"><span className='font-semibold'>End time:</span> {task.end_time ? formatDate(task.end_time) : 'No end time'}
                </h1>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 