-- Add foreign key relationship between employee_salaries and employees
ALTER TABLE public.employee_salaries
ADD CONSTRAINT employee_salaries_employee_id_fkey
FOREIGN KEY (employee_id)
REFERENCES public.employees(id)
ON DELETE CASCADE;