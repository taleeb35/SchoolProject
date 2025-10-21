-- Create attendance table for tracking employee leaves
CREATE TABLE IF NOT EXISTS public.employee_attendance (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  month INTEGER NOT NULL,
  year INTEGER NOT NULL,
  leaves_taken INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(employee_id, month, year)
);

-- Enable RLS
ALTER TABLE public.employee_attendance ENABLE ROW LEVEL SECURITY;

-- Create policies for attendance
CREATE POLICY "Admins can view all attendance records"
  ON public.employee_attendance
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert attendance records"
  ON public.employee_attendance
  FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update attendance records"
  ON public.employee_attendance
  FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete attendance records"
  ON public.employee_attendance
  FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_employee_attendance_updated_at
  BEFORE UPDATE ON public.employee_attendance
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();