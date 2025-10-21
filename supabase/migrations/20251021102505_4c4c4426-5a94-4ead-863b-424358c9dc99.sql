-- Grant admin role to the new email if the user exists
insert into public.user_roles (user_id, role)
select u.id, 'admin'::app_role
from auth.users u
where u.email = 'unzelondon1@gmail.com'
and not exists (
  select 1 from public.user_roles ur
  where ur.user_id = u.id and ur.role = 'admin'
);

-- OPTIONAL: If you also want to remove admin from the old email, uncomment below
-- delete from public.user_roles ur
-- using auth.users u
-- where ur.user_id = u.id and ur.role = 'admin' and u.email = 'admin@school.com';