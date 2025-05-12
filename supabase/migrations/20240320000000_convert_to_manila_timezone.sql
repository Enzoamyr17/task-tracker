-- Convert timestamps to Manila timezone
UPDATE tasks
SET 
  due_date = due_date AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Manila',
  date_created = date_created AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Manila';

-- Update the column types to use timestamptz
ALTER TABLE tasks
  ALTER COLUMN due_date TYPE timestamptz USING due_date AT TIME ZONE 'Asia/Manila',
  ALTER COLUMN date_created TYPE timestamptz USING date_created AT TIME ZONE 'Asia/Manila';

-- Set the timezone for the database
ALTER DATABASE postgres SET timezone TO 'Asia/Manila'; 