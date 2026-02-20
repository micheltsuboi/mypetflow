-- Migration 041: Add work_schedule column to profiles table

-- The work_schedule will store a JSON array where each item represents a day of the week (0 = Sunday, 1 = Monday, etc.)
-- Ex: [ { "day": 1, "isActive": true, "start": "08:00", "end": "18:00", "lunchStart": "12:00", "lunchEnd": "13:00" }, ... ]

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS work_schedule JSONB DEFAULT '[]'::jsonb;

-- Migrate existing work hours to JSON format for active employees
DO $$
DECLARE
    r RECORD;
    schedule_json JSONB;
BEGIN
    FOR r IN SELECT id, work_start_time, work_end_time, lunch_start_time, lunch_end_time FROM public.profiles WHERE role != 'customer'
    LOOP
        -- Default to Mon-Fri (1-5) if they had work times, otherwise empty
        IF r.work_start_time IS NOT NULL THEN
            schedule_json := jsonb_build_array(
                jsonb_build_object('day', 0, 'isActive', false, 'start', '', 'end', '', 'lunchStart', '', 'lunchEnd', ''),
                jsonb_build_object('day', 1, 'isActive', true, 'start', coalesce(r.work_start_time, '08:00'), 'end', coalesce(r.work_end_time, '18:00'), 'lunchStart', coalesce(r.lunch_start_time, '12:00'), 'lunchEnd', coalesce(r.lunch_end_time, '13:00')),
                jsonb_build_object('day', 2, 'isActive', true, 'start', coalesce(r.work_start_time, '08:00'), 'end', coalesce(r.work_end_time, '18:00'), 'lunchStart', coalesce(r.lunch_start_time, '12:00'), 'lunchEnd', coalesce(r.lunch_end_time, '13:00')),
                jsonb_build_object('day', 3, 'isActive', true, 'start', coalesce(r.work_start_time, '08:00'), 'end', coalesce(r.work_end_time, '18:00'), 'lunchStart', coalesce(r.lunch_start_time, '12:00'), 'lunchEnd', coalesce(r.lunch_end_time, '13:00')),
                jsonb_build_object('day', 4, 'isActive', true, 'start', coalesce(r.work_start_time, '08:00'), 'end', coalesce(r.work_end_time, '18:00'), 'lunchStart', coalesce(r.lunch_start_time, '12:00'), 'lunchEnd', coalesce(r.lunch_end_time, '13:00')),
                jsonb_build_object('day', 5, 'isActive', true, 'start', coalesce(r.work_start_time, '08:00'), 'end', coalesce(r.work_end_time, '18:00'), 'lunchStart', coalesce(r.lunch_start_time, '12:00'), 'lunchEnd', coalesce(r.lunch_end_time, '13:00')),
                jsonb_build_object('day', 6, 'isActive', false, 'start', '', 'end', '', 'lunchStart', '', 'lunchEnd', '')
            );
            
            UPDATE public.profiles SET work_schedule = schedule_json WHERE id = r.id;
        END IF;
    END LOOP;
END $$;
