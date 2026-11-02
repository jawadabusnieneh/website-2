-- Read-only owner-account diagnostics for the Supabase SQL Editor.
-- Run in the same project as the host shown under "تفاصيل الاتصال".
-- Returns status only: no passwords, password hashes, keys or tokens.
select
  u.email,
  u.email_confirmed_at is not null as email_confirmed,
  coalesce(u.encrypted_password, '') <> '' as password_set,
  exists (
    select 1 from public.owners o where o.user_id = u.id
  ) as is_owner
from auth.users u
order by u.created_at desc
limit 5;
