-- Run once in the Supabase SQL editor. No service-role key belongs in the frontend.
begin;
create table if not exists public.owners (
  user_id uuid primary key references auth.users(id) on delete cascade
);
alter table public.owners enable row level security;
create policy "Owners can see their own membership" on public.owners
  for select to authenticated using (user_id = (select auth.uid()));
-- Membership is provisioned by the project administrator, never by a browser.
revoke all on public.owners from anon, authenticated;
grant select on public.owners to authenticated;
create or replace function public.is_store_owner() returns boolean
language sql stable security definer set search_path = ''
as $$ select exists(select 1 from public.owners where user_id = (select auth.uid())); $$;
revoke all on function public.is_store_owner() from public;
grant execute on function public.is_store_owner() to anon, authenticated;

do $$
declare table_name text;
begin
 foreach table_name in array array['products','categories','banners','reviews','settings'] loop
  execute format('create table if not exists public.%I (id text primary key, payload jsonb not null, published boolean not null default false, sort_order integer not null default 0, updated_at timestamptz not null default now(), constraint valid_payload check (jsonb_typeof(payload) = ''object'' and payload->>''id'' = id))',table_name);
  execute format('alter table public.%I enable row level security',table_name);
  execute format('create policy "Published storefront content" on public.%I for select to anon,authenticated using (published or (select public.is_store_owner()))',table_name);
  execute format('create policy "Owner insert" on public.%I for insert to authenticated with check ((select public.is_store_owner()))',table_name);
  execute format('create policy "Owner update" on public.%I for update to authenticated using ((select public.is_store_owner())) with check ((select public.is_store_owner()))',table_name);
  execute format('create policy "Owner delete" on public.%I for delete to authenticated using ((select public.is_store_owner()))',table_name);
  execute format('grant select on public.%I to anon,authenticated',table_name);
  execute format('grant insert,update,delete on public.%I to authenticated',table_name);
 end loop;
end $$;
-- A single, public settings document; never place credentials in this table.
alter table public.settings add constraint singleton_settings check (id='store');
-- Private storage: knowing a draft filename does not grant download permission.
insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('store-media','store-media',false,8388608,array['image/jpeg','image/png','image/webp'])
on conflict(id) do update set public=false,file_size_limit=8388608,allowed_mime_types=array['image/jpeg','image/png','image/webp'];
create policy "Published images or owner" on storage.objects for select to anon,authenticated using (
 bucket_id='store-media' and (
 (select public.is_store_owner()) or
 exists(select 1 from public.products p where p.published and p.payload->'images' ? ('storage://' || name)) or
 exists(select 1 from public.categories c where c.published and c.payload->>'image' = 'storage://' || name) or
 exists(select 1 from public.banners b where b.published and ('storage://' || name) in (b.payload->>'image',b.payload->>'mobileImage')) or
 exists(select 1 from public.reviews r where r.published and r.payload->>'image' = 'storage://' || name) or
 exists(select 1 from public.settings s where s.published and ('storage://' || name) in (s.payload->>'logo',s.payload->>'promoImage'))
 ));
create policy "Owner upload" on storage.objects for insert to authenticated with check (bucket_id='store-media' and (select public.is_store_owner()));
create policy "Owner replace" on storage.objects for update to authenticated using (bucket_id='store-media' and (select public.is_store_owner())) with check (bucket_id='store-media' and (select public.is_store_owner()));
create policy "Owner delete media" on storage.objects for delete to authenticated using (bucket_id='store-media' and (select public.is_store_owner()));
-- Realtime is optional. Focus refresh also picks up changes in other browsers.
do $$
declare t text;
begin
 foreach t in array array['products','categories','banners','reviews','settings'] loop
  if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename=t) then
   execute format('alter publication supabase_realtime add table public.%I',t);
  end if;
 end loop;
end $$;
commit;
