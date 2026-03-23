-- Add notify_reminder_same_day to organizations table
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS notify_reminder_same_day BOOLEAN DEFAULT FALSE;

-- Update RLS or something? Usually not needed if it's just a column add and we already have policies for organizations.
