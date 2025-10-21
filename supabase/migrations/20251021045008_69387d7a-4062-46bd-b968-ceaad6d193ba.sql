-- Make last_name and father_name optional in students table
ALTER TABLE public.students
ALTER COLUMN last_name DROP NOT NULL;

ALTER TABLE public.students
ALTER COLUMN father_name DROP NOT NULL;