export interface Task {
  id: string;
  task: string;
  description: string | null;
  due_date: string | null;
  date_created: string;
  project_id: string | null;
  user_id: string;
  priority: 'low' | 'medium' | 'high';
  is_completed: boolean;
  start_time: string | null;
  end_time: string | null;
  is_recurring: boolean;
  recurrence_pattern: string | null;
  recurrence_end_date: string | null;
  projects?: {
    name: string;
  } | null;
} 