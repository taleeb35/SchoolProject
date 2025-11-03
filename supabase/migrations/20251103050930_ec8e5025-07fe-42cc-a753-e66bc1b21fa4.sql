-- Add display_order column to students table for custom sorting
ALTER TABLE public.students
ADD COLUMN display_order integer DEFAULT 0;

-- Create index for better performance when sorting by display_order
CREATE INDEX idx_students_display_order ON public.students(class_id, display_order);

-- Update existing students to have sequential display orders based on current first_name order
WITH numbered_students AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY class_id ORDER BY first_name) as row_num
  FROM public.students
)
UPDATE public.students
SET display_order = numbered_students.row_num
FROM numbered_students
WHERE public.students.id = numbered_students.id;