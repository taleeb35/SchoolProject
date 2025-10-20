-- Add monthly_fee column to classes table
ALTER TABLE public.classes ADD COLUMN IF NOT EXISTS monthly_fee numeric DEFAULT 0 NOT NULL;

-- Insert admin role for the existing user
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::app_role
FROM auth.users
WHERE email = 'admin@school.com'
ON CONFLICT (user_id, role) DO NOTHING;