-- Escale Fraîcheur MVP
-- À exécuter dans le SQL Editor de Supabase ou avec `supabase db push`.

create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;
create extension if not exists postgis with schema extensions;

-- ---------- Types ----------
do $$ begin
  create type public.profile_role as enum ('user', 'moderator', 'admin');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.place_publication_status as enum ('pending', 'published', 'rejected', 'archived');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.place_source_type as enum ('community', 'owner', 'admin');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.place_verification_status as enum ('unverified', 'community', 'verified');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.place_status as enum ('open', 'conditional', 'unconfirmed', 'closed');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.availability_mode as enum ('always', 'heatwave', 'manual');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.member_role as enum ('owner', 'manager', 'editor');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.submission_kind as enum ('new_place', 'correction', 'report');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.moderation_status as enum ('pending', 'approved', 'rejected');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.claim_status as enum ('pending', 'approved', 'rejected');
exception when duplicate_object then null; end $$;

-- ---------- Tables ----------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  role public.profile_role not null default 'user',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.places (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null check (char_length(name) between 2 and 120),
  address_line text not null check (char_length(address_line) between 3 and 300),
  postal_code text not null default '',
  city text not null default '',
  country text not null default 'France',
  latitude double precision not null check (latitude between -90 and 90),
  longitude double precision not null check (longitude between -180 and 180),
  location extensions.geography(point, 4326) generated always as (
    extensions.st_setsrid(extensions.st_makepoint(longitude, latitude), 4326)::extensions.geography
  ) stored,
  photo_url text,
  description text check (description is null or char_length(description) <= 1500),
  publication_status public.place_publication_status not null default 'pending',
  source_type public.place_source_type not null default 'community',
  verification_status public.place_verification_status not null default 'unverified',
  availability_mode public.availability_mode not null default 'manual',
  current_status public.place_status not null default 'unconfirmed',
  current_status_expires_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists places_location_gix on public.places using gist (location);
create index if not exists places_publication_status_idx on public.places (publication_status);
create index if not exists places_city_idx on public.places (city);

create table if not exists public.amenities (
  code text primary key,
  label text not null,
  icon text not null default 'sparkles',
  sort_order integer not null default 100
);

insert into public.amenities (code, label, icon, sort_order) values
  ('cooled_space', 'Espace rafraîchi', 'snowflake', 10),
  ('seating', 'Places assises', 'armchair', 20),
  ('drinking_water', 'Eau potable', 'glass-water', 30),
  ('staff_help', 'Équipe à votre écoute', 'message-circle', 40),
  ('accessible', 'Accessible PMR', 'accessibility', 50),
  ('toilets', 'Toilettes', 'badge-info', 60),
  ('phone_charging', 'Recharge téléphone', 'battery-charging', 70)
on conflict (code) do update set
  label = excluded.label,
  icon = excluded.icon,
  sort_order = excluded.sort_order;

create table if not exists public.place_amenities (
  place_id uuid not null references public.places(id) on delete cascade,
  amenity_code text not null references public.amenities(code) on delete restrict,
  created_at timestamptz not null default now(),
  primary key (place_id, amenity_code)
);

create table if not exists public.opening_periods (
  id uuid primary key default gen_random_uuid(),
  place_id uuid not null references public.places(id) on delete cascade,
  weekday smallint not null check (weekday between 1 and 7),
  opens time not null,
  closes time not null,
  note text check (note is null or char_length(note) <= 300),
  created_at timestamptz not null default now()
);

create index if not exists opening_periods_place_idx on public.opening_periods (place_id, weekday);

create table if not exists public.place_members (
  place_id uuid not null references public.places(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.member_role not null default 'editor',
  created_at timestamptz not null default now(),
  primary key (place_id, user_id)
);

create index if not exists place_members_user_idx on public.place_members (user_id);

create table if not exists public.place_posts (
  id uuid primary key default gen_random_uuid(),
  place_id uuid not null references public.places(id) on delete cascade,
  author_id uuid references auth.users(id) on delete set null default auth.uid(),
  title text check (title is null or char_length(title) <= 140),
  body text not null check (char_length(body) between 3 and 1200),
  starts_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists place_posts_place_idx on public.place_posts (place_id, created_at desc);

create table if not exists public.public_submissions (
  id uuid primary key default gen_random_uuid(),
  kind public.submission_kind not null,
  place_id uuid references public.places(id) on delete set null,
  payload jsonb not null default '{}'::jsonb,
  contact_email text check (contact_email is null or char_length(contact_email) <= 254),
  status public.moderation_status not null default 'pending',
  reviewer_id uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists public_submissions_status_idx on public.public_submissions (status, created_at);

create table if not exists public.claims (
  id uuid primary key default gen_random_uuid(),
  place_id uuid not null references public.places(id) on delete cascade,
  requester_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  message text check (message is null or char_length(message) <= 1000),
  verification_method text,
  status public.claim_status not null default 'pending',
  reviewer_id uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

create unique index if not exists claims_one_pending_idx
on public.claims (place_id, requester_id) where status = 'pending';

create table if not exists public.audit_log (
  id bigint generated by default as identity primary key,
  actor_id uuid references auth.users(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- ---------- Utility functions ----------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create trigger places_set_updated_at
before update on public.places
for each row execute function public.set_updated_at();

create trigger place_posts_set_updated_at
before update on public.place_posts
for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.current_user_is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

create or replace function public.user_can_manage_place(p_place_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_user_is_admin() or exists (
    select 1 from public.place_members
    where place_id = p_place_id and user_id = auth.uid()
  );
$$;

create or replace function public.user_can_admin_place(p_place_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_user_is_admin() or exists (
    select 1 from public.place_members
    where place_id = p_place_id
      and user_id = auth.uid()
      and role in ('owner', 'manager')
  );
$$;

-- ---------- RLS ----------
alter table public.profiles enable row level security;
alter table public.places enable row level security;
alter table public.amenities enable row level security;
alter table public.place_amenities enable row level security;
alter table public.opening_periods enable row level security;
alter table public.place_members enable row level security;
alter table public.place_posts enable row level security;
alter table public.public_submissions enable row level security;
alter table public.claims enable row level security;
alter table public.audit_log enable row level security;

create policy "profiles_read_own_or_admin" on public.profiles
for select using (id = auth.uid() or public.current_user_is_admin());

create policy "profiles_update_own" on public.profiles
for update using (id = auth.uid()) with check (id = auth.uid());

create policy "places_public_or_managed_read" on public.places
for select using (
  publication_status = 'published'
  or public.user_can_manage_place(id)
  or public.current_user_is_admin()
);

create policy "places_managers_update" on public.places
for update using (public.user_can_admin_place(id))
with check (public.user_can_admin_place(id));

create policy "amenities_public_read" on public.amenities
for select using (true);

create policy "place_amenities_read_visible" on public.place_amenities
for select using (
  exists (
    select 1 from public.places p
    where p.id = place_id
      and (p.publication_status = 'published' or public.user_can_manage_place(p.id) or public.current_user_is_admin())
  )
);

create policy "place_amenities_manage" on public.place_amenities
for all using (public.user_can_manage_place(place_id))
with check (public.user_can_manage_place(place_id));

create policy "opening_periods_read_visible" on public.opening_periods
for select using (
  exists (
    select 1 from public.places p
    where p.id = place_id
      and (p.publication_status = 'published' or public.user_can_manage_place(p.id) or public.current_user_is_admin())
  )
);

create policy "opening_periods_manage" on public.opening_periods
for all using (public.user_can_manage_place(place_id))
with check (public.user_can_manage_place(place_id));

create policy "place_members_read_own_or_admin" on public.place_members
for select using (user_id = auth.uid() or public.current_user_is_admin());

create policy "place_posts_read_visible" on public.place_posts
for select using (
  exists (
    select 1 from public.places p
    where p.id = place_id
      and (
        public.user_can_manage_place(p.id)
        or public.current_user_is_admin()
        or (
          p.publication_status = 'published'
          and (starts_at is null or starts_at <= now())
          and (expires_at is null or expires_at > now())
        )
      )
  )
);

create policy "place_posts_insert_managed" on public.place_posts
for insert with check (public.user_can_manage_place(place_id) and author_id = auth.uid());

create policy "place_posts_update_managed" on public.place_posts
for update using (public.user_can_manage_place(place_id))
with check (public.user_can_manage_place(place_id));

create policy "place_posts_delete_managed" on public.place_posts
for delete using (public.user_can_admin_place(place_id));

create policy "claims_insert_authenticated" on public.claims
for insert to authenticated
with check (requester_id = auth.uid());

create policy "claims_read_own_or_admin" on public.claims
for select using (requester_id = auth.uid() or public.current_user_is_admin());

create policy "public_submissions_admin_read" on public.public_submissions
for select using (public.current_user_is_admin());

create policy "audit_log_admin_read" on public.audit_log
for select using (public.current_user_is_admin());

-- ---------- Owner / manager RPCs ----------
create or replace function public.create_owned_place(
  p_name text,
  p_address_line text,
  p_postal_code text,
  p_city text,
  p_latitude double precision,
  p_longitude double precision,
  p_description text default null,
  p_amenity_codes text[] default '{}'::text[]
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_place uuid;
  v_slug text;
begin
  if v_user is null then
    raise exception 'Authentication required';
  end if;
  if char_length(trim(p_name)) < 2 or char_length(trim(p_address_line)) < 3 then
    raise exception 'Invalid place data';
  end if;
  if p_latitude not between -90 and 90 or p_longitude not between -180 and 180 then
    raise exception 'Invalid coordinates';
  end if;

  v_slug := 'place-' || substr(md5(gen_random_uuid()::text), 1, 10);

  insert into public.places (
    slug, name, address_line, postal_code, city, latitude, longitude,
    description, publication_status, source_type, verification_status,
    current_status, availability_mode, created_by
  ) values (
    v_slug, trim(p_name), trim(p_address_line), coalesce(trim(p_postal_code), ''), coalesce(trim(p_city), ''),
    p_latitude, p_longitude, nullif(trim(p_description), ''), 'pending', 'owner', 'unverified',
    'unconfirmed', 'manual', v_user
  ) returning id into v_place;

  insert into public.place_members (place_id, user_id, role)
  values (v_place, v_user, 'owner');

  insert into public.place_amenities (place_id, amenity_code)
  select v_place, code from public.amenities
  where code = any(coalesce(p_amenity_codes, '{}'::text[]))
  on conflict do nothing;

  insert into public.audit_log(actor_id, action, entity_type, entity_id)
  values (v_user, 'create_owned_place', 'place', v_place::text);

  return v_place;
end;
$$;

create or replace function public.replace_place_amenities(
  p_place_id uuid,
  p_amenity_codes text[]
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.user_can_manage_place(p_place_id) then
    raise exception 'Forbidden';
  end if;

  delete from public.place_amenities where place_id = p_place_id;
  insert into public.place_amenities (place_id, amenity_code)
  select p_place_id, code from public.amenities
  where code = any(coalesce(p_amenity_codes, '{}'::text[]))
  on conflict do nothing;
end;
$$;

-- ---------- Admin moderation RPCs ----------
create or replace function public.moderate_place(p_place_id uuid, p_decision text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.current_user_is_admin() then raise exception 'Forbidden'; end if;
  if p_decision not in ('approve', 'reject') then raise exception 'Invalid decision'; end if;

  update public.places
  set publication_status = case when p_decision = 'approve' then 'published'::public.place_publication_status else 'rejected'::public.place_publication_status end
  where id = p_place_id;

  insert into public.audit_log(actor_id, action, entity_type, entity_id, details)
  values (auth.uid(), 'moderate_place', 'place', p_place_id::text, jsonb_build_object('decision', p_decision));
  return p_place_id;
end;
$$;

create or replace function public.moderate_claim(p_claim_id uuid, p_decision text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_claim public.claims%rowtype;
begin
  if not public.current_user_is_admin() then raise exception 'Forbidden'; end if;
  if p_decision not in ('approve', 'reject') then raise exception 'Invalid decision'; end if;

  select * into v_claim from public.claims where id = p_claim_id for update;
  if not found then raise exception 'Claim not found'; end if;

  if p_decision = 'approve' then
    insert into public.place_members(place_id, user_id, role)
    values (v_claim.place_id, v_claim.requester_id, 'owner')
    on conflict (place_id, user_id) do update set role = 'owner';

    update public.places
    set verification_status = 'verified'
    where id = v_claim.place_id;
  end if;

  update public.claims
  set status = case when p_decision = 'approve' then 'approved'::public.claim_status else 'rejected'::public.claim_status end,
      reviewer_id = auth.uid(),
      reviewed_at = now()
  where id = p_claim_id;

  insert into public.audit_log(actor_id, action, entity_type, entity_id, details)
  values (auth.uid(), 'moderate_claim', 'claim', p_claim_id::text, jsonb_build_object('decision', p_decision));
  return p_claim_id;
end;
$$;

create or replace function public.moderate_public_submission(p_submission_id uuid, p_decision text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_submission public.public_submissions%rowtype;
  v_place_id uuid;
  v_lat double precision;
  v_lon double precision;
  v_slug text;
begin
  if not public.current_user_is_admin() then raise exception 'Forbidden'; end if;
  if p_decision not in ('approve', 'reject') then raise exception 'Invalid decision'; end if;

  select * into v_submission from public.public_submissions where id = p_submission_id for update;
  if not found then raise exception 'Submission not found'; end if;

  if p_decision = 'approve' and v_submission.kind = 'new_place' then
    v_lat := nullif(v_submission.payload->>'latitude', '')::double precision;
    v_lon := nullif(v_submission.payload->>'longitude', '')::double precision;
    if v_lat is null or v_lon is null or v_lat not between -90 and 90 or v_lon not between -180 and 180 then
      raise exception 'Invalid coordinates';
    end if;

    v_slug := 'place-' || substr(md5(gen_random_uuid()::text), 1, 10);
    insert into public.places (
      slug, name, address_line, postal_code, city, latitude, longitude,
      publication_status, source_type, verification_status, current_status, availability_mode
    ) values (
      v_slug,
      left(coalesce(v_submission.payload->>'name', 'Escale sans nom'), 120),
      left(coalesce(v_submission.payload->>'address', 'Adresse à confirmer'), 300),
      left(coalesce(v_submission.payload->>'postal_code', ''), 20),
      left(coalesce(v_submission.payload->>'city', ''), 120),
      v_lat,
      v_lon,
      'published',
      'community',
      'community',
      'unconfirmed',
      'manual'
    ) returning id into v_place_id;

    insert into public.place_amenities(place_id, amenity_code)
    select v_place_id, a.code
    from public.amenities a
    where a.code in (
      select jsonb_array_elements_text(coalesce(v_submission.payload->'amenity_codes', '[]'::jsonb))
    )
    on conflict do nothing;
  end if;

  update public.public_submissions
  set status = case when p_decision = 'approve' then 'approved'::public.moderation_status else 'rejected'::public.moderation_status end,
      reviewer_id = auth.uid(),
      reviewed_at = now()
  where id = p_submission_id;

  insert into public.audit_log(actor_id, action, entity_type, entity_id, details)
  values (auth.uid(), 'moderate_public_submission', 'public_submission', p_submission_id::text,
          jsonb_build_object('decision', p_decision, 'created_place_id', v_place_id));

  return coalesce(v_place_id, p_submission_id);
end;
$$;

-- ---------- Table privileges (RLS still applies) ----------
grant select on public.places, public.amenities, public.place_amenities, public.opening_periods, public.place_posts to anon, authenticated;
grant select on public.profiles, public.place_members, public.claims, public.public_submissions, public.audit_log to authenticated;
revoke update on public.profiles from authenticated;
grant update (display_name) on public.profiles to authenticated;
revoke update on public.places from authenticated;
grant update (name, description, photo_url, current_status, current_status_expires_at, availability_mode) on public.places to authenticated;
grant insert, update, delete on public.place_posts to authenticated;
grant insert on public.claims to authenticated;
grant insert, update, delete on public.place_amenities, public.opening_periods to authenticated;

-- ---------- Function permissions ----------
revoke all on function public.current_user_is_admin() from public;
revoke all on function public.user_can_manage_place(uuid) from public;
revoke all on function public.user_can_admin_place(uuid) from public;
revoke all on function public.create_owned_place(text,text,text,text,double precision,double precision,text,text[]) from public;
revoke all on function public.replace_place_amenities(uuid,text[]) from public;
revoke all on function public.moderate_place(uuid,text) from public;
revoke all on function public.moderate_claim(uuid,text) from public;
revoke all on function public.moderate_public_submission(uuid,text) from public;

grant execute on function public.current_user_is_admin() to authenticated, anon;
grant execute on function public.user_can_manage_place(uuid) to authenticated, anon;
grant execute on function public.user_can_admin_place(uuid) to authenticated, anon;
grant execute on function public.create_owned_place(text,text,text,text,double precision,double precision,text,text[]) to authenticated;
grant execute on function public.replace_place_amenities(uuid,text[]) to authenticated;
grant execute on function public.moderate_place(uuid,text) to authenticated;
grant execute on function public.moderate_claim(uuid,text) to authenticated;
grant execute on function public.moderate_public_submission(uuid,text) to authenticated;

-- ---------- Storage bucket for venue photos ----------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('place-media', 'place-media', true, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "place_media_public_read" on storage.objects
for select using (bucket_id = 'place-media');

create policy "place_media_member_insert" on storage.objects
for insert to authenticated
with check (
  bucket_id = 'place-media'
  and exists (
    select 1 from public.place_members pm
    where pm.user_id = auth.uid()
      and pm.place_id::text = (storage.foldername(name))[1]
  )
);

create policy "place_media_member_update" on storage.objects
for update to authenticated
using (
  bucket_id = 'place-media'
  and exists (
    select 1 from public.place_members pm
    where pm.user_id = auth.uid()
      and pm.place_id::text = (storage.foldername(name))[1]
  )
);

create policy "place_media_member_delete" on storage.objects
for delete to authenticated
using (
  bucket_id = 'place-media'
  and exists (
    select 1 from public.place_members pm
    where pm.user_id = auth.uid()
      and pm.place_id::text = (storage.foldername(name))[1]
  )
);
