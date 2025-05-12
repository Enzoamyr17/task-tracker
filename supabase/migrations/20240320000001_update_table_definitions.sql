-- Update the tasks table definition
CREATE TABLE IF NOT EXISTS tasks (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  task text NOT NULL,
  description text,
  due_date timestamptz,
  date_created timestamptz DEFAULT now(),
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  priority text CHECK (priority IN ('low', 'medium', 'high')) DEFAULT 'medium',
  is_completed boolean DEFAULT false
);

-- Update the projects table definition
CREATE TABLE IF NOT EXISTS projects (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  description text,
  date_created timestamptz DEFAULT now(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Update the notification_settings table definition
CREATE TABLE IF NOT EXISTS notification_settings (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  notify_before_minutes integer DEFAULT 30,
  notify_on_due boolean DEFAULT true,
  notify_on_overdue boolean DEFAULT true,
  push_subscription jsonb,
  date_created timestamptz DEFAULT now()
); 