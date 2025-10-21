-- Update employee_attendance table to store daily attendance
ALTER TABLE public.employee_attendance 
ADD COLUMN attendance_data JSONB DEFAULT '{}'::jsonb;

-- Add comment for clarity
COMMENT ON COLUMN public.employee_attendance.attendance_data IS 'Daily attendance data as {day: status} where status is P (Present), A (Absent), H (Holiday), R (Rest/Off)';

-- Insert admin role for unzelondon1@gmail.com
-- Note: This will only work after the user signs up with this email
-- The user_id will be automatically set when they create their account
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::app_role 
FROM auth.users 
WHERE email = 'unzelondon1@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;