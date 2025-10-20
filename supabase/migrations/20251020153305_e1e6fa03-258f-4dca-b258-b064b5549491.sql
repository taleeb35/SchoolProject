-- Update students table to have first_name and last_name
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS first_name text;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS last_name text;

-- Migrate existing name data (split on first space)
UPDATE public.students 
SET 
  first_name = SPLIT_PART(name, ' ', 1),
  last_name = CASE 
    WHEN name LIKE '% %' THEN SUBSTRING(name FROM POSITION(' ' IN name) + 1)
    ELSE ''
  END
WHERE first_name IS NULL;

-- Now drop the old name column and make first_name required
ALTER TABLE public.students DROP COLUMN IF EXISTS name;
ALTER TABLE public.students ALTER COLUMN first_name SET NOT NULL;
ALTER TABLE public.students ALTER COLUMN last_name SET NOT NULL;

-- Create employees table
CREATE TABLE IF NOT EXISTS public.employees (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  phone text,
  designation text,
  salary numeric NOT NULL DEFAULT 0,
  joining_date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on employees
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;

-- RLS policies for employees
CREATE POLICY "Admins can view all employees" 
  ON public.employees FOR SELECT 
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert employees" 
  ON public.employees FOR INSERT 
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update employees" 
  ON public.employees FOR UPDATE 
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete employees" 
  ON public.employees FOR DELETE 
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Create employee_classes junction table (one employee to one class)
CREATE TABLE IF NOT EXISTS public.employee_classes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  class_id uuid NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(employee_id, class_id)
);

-- Enable RLS on employee_classes
ALTER TABLE public.employee_classes ENABLE ROW LEVEL SECURITY;

-- RLS policies for employee_classes
CREATE POLICY "Admins can view all employee_classes" 
  ON public.employee_classes FOR SELECT 
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert employee_classes" 
  ON public.employee_classes FOR INSERT 
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete employee_classes" 
  ON public.employee_classes FOR DELETE 
  USING (has_role(auth.uid(), 'admin'::app_role));