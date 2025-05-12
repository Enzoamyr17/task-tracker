-- Add recurring task fields
ALTER TABLE tasks
ADD COLUMN is_recurring boolean DEFAULT false,
ADD COLUMN recurrence_pattern text CHECK (recurrence_pattern IN ('daily', 'weekly', 'monthly', 'yearly')),
ADD COLUMN recurrence_end_date timestamptz,
ADD COLUMN parent_task_id uuid REFERENCES tasks(id) ON DELETE CASCADE;

-- Create index for recurring tasks
CREATE INDEX idx_tasks_recurring ON tasks(is_recurring, parent_task_id); 