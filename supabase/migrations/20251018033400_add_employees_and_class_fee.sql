-- supabase/migrations/YYYYMMDDHHMMSS_add_employees_and_class_fee.sql

-- Add monthly_fee column to classes table
ALTER TABLE public.classes
ADD COLUMN monthly_fee DECIMAL(10, 2) NOT NULL DEFAULT 0;

-- Create employees table
CREATE TABLE public.employees (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT,
  designation TEXT,
  salary DECIMAL(10, 2) NOT NULL DEFAULT 0,
  joining_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on employees
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;

-- Create employee_classes junction table
CREATE TABLE public.employee_classes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(employee_id, class_id) -- Ensure an employee isn't assigned to the same class twice
);

-- Enable RLS on employee_classes
ALTER TABLE public.employee_classes ENABLE ROW LEVEL SECURITY;

--
-- RLS Policies for employees (admin only)
CREATE POLICY "Admins can view all employees"
  ON public.employees FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert employees"
  ON public.employees FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update employees"
  ON public.employees FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete employees"
  ON public.employees FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for employee_classes (admin only)
CREATE POLICY "Admins can view all employee class assignments"
  ON public.employee_classes FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert employee class assignments"
  ON public.employee_classes FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update employee class assignments"
  ON public.employee_classes FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin')); -- Note: Update might be less common here

CREATE POLICY "Admins can delete employee class assignments"
  ON public.employee_classes FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));

-- Update existing policy for classes to include monthly_fee if needed (not strictly required for insert/update)
-- Example: Allow update of monthly_fee
-- If you need to re-create the update policy:
DROP POLICY IF EXISTS "Admins can update classes" ON public.classes;
CREATE POLICY "Admins can update classes"
  ON public.classes FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

-- You might also want to update the student fee logic later.
-- For now, student.total_fee overrides class.monthly_fee
-- Consider adding a trigger to fee_records to auto-populate 'amount'
-- based on student.total_fee or class.monthly_fee upon creation?


-- Function to update the amount in fee_records based on student's total_fee
-- This assumes student's total_fee is the primary source.
-- If you want class fee as default, the logic needs adjustment.
CREATE OR REPLACE FUNCTION public.set_fee_amount()
RETURNS TRIGGER AS $$
DECLARE
  student_fee DECIMAL(10, 2);
BEGIN
  -- Get the student's total fee
  SELECT total_fee INTO student_fee
  FROM public.students
  WHERE id = NEW.student_id;

  -- Set the amount for the new fee record
  NEW.amount = COALESCE(student_fee, 0); -- Use 0 if student fee is null

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to automatically set the fee amount when a new record is inserted
CREATE TRIGGER set_fee_record_amount_trigger
BEFORE INSERT ON public.fee_records
FOR EACH ROW
EXECUTE FUNCTION public.set_fee_amount();