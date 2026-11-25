-- ===========================================================================
-- SkillSphere — initial schema
-- Run in the Supabase SQL editor, or with `supabase db push`.
-- Every table is protected by Row Level Security.
-- ===========================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null,
  username text unique,
  avatar_url text,
  bio text,
  profession text,
  location text,
  onboarding_complete boolean not null default false,
  profile_visibility text not null default 'public'
    check (profile_visibility in ('public', 'connections')),
  show_email boolean not null default false,
  notify_connections boolean not null default true,
  notify_comments boolean not null default true,
  notify_tasks boolean not null default true,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Skills are stored by name + kind on the user. A global skills catalogue is
-- intentionally not required: free-text skills match better for a hackathon
-- dataset than a curated taxonomy, and matching normalises them at query time.
create table if not exists public.user_skills (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 40),
  kind text not null check (kind in ('expertise', 'interest', 'learning', 'help')),
  created_at timestamptz not null default now(),
  unique (user_id, name, kind)
);
create index if not exists user_skills_user_idx on public.user_skills (user_id);
create index if not exists user_skills_name_idx on public.user_skills (lower(name));

create table if not exists public.problems (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  title text not null check (char_length(title) between 8 and 160),
  description text not null check (char_length(description) between 30 and 8000),
  category text not null check (category in (
    'programming', 'ai-ml', 'mathematics', 'science-research',
    'engineering-robotics', 'design-creativity', 'business', 'education', 'general'
  )),
  help_type text not null check (help_type in ('advice', 'collaboration', 'review', 'research', 'build')),
  status text not null default 'open'
    check (status in ('open', 'in_progress', 'solved', 'partially_solved', 'unable_to_verify')),
  tags text[] not null default '{}',
  required_skills text[] not null default '{}',
  ai_analysis jsonb,
  attachment_url text,
  cover_url text,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists problems_created_idx on public.problems (created_at desc);
create index if not exists problems_owner_idx on public.problems (owner_id);
create index if not exists problems_category_idx on public.problems (category);
create index if not exists problems_status_idx on public.problems (status);
create index if not exists problems_tags_idx on public.problems using gin (tags);
create index if not exists problems_skills_idx on public.problems using gin (required_skills);

create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  problem_id uuid not null references public.problems (id) on delete cascade,
  author_id uuid not null references public.profiles (id) on delete cascade,
  body text not null check (char_length(body) between 2 and 4000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists comments_problem_idx on public.comments (problem_id, created_at);

create table if not exists public.comment_helpful (
  comment_id uuid not null references public.comments (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (comment_id, user_id)
);

create table if not exists public.connections (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references public.profiles (id) on delete cascade,
  addressee_id uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined')),
  created_at timestamptz not null default now(),
  unique (requester_id, addressee_id),
  check (requester_id <> addressee_id)
);
create index if not exists connections_addressee_idx on public.connections (addressee_id, status);

create table if not exists public.collaboration_tasks (
  id uuid primary key default gen_random_uuid(),
  problem_id uuid not null references public.problems (id) on delete cascade,
  title text not null check (char_length(title) between 3 and 120),
  description text,
  assignee_id uuid references public.profiles (id) on delete set null,
  status text not null default 'todo' check (status in ('todo', 'in_progress', 'done')),
  created_by uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now()
);
create index if not exists tasks_problem_idx on public.collaboration_tasks (problem_id);

create table if not exists public.shared_resources (
  id uuid primary key default gen_random_uuid(),
  problem_id uuid not null references public.problems (id) on delete cascade,
  title text not null check (char_length(title) between 3 and 120),
  url text not null,
  description text,
  added_by uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now()
);
create index if not exists resources_problem_idx on public.shared_resources (problem_id);

create table if not exists public.problem_contributors (
  problem_id uuid not null references public.problems (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role text,
  added_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (problem_id, user_id)
);

create table if not exists public.solution_reports (
  id uuid primary key default gen_random_uuid(),
  problem_id uuid not null references public.problems (id) on delete cascade,
  author_id uuid not null references public.profiles (id) on delete cascade,
  outcome_status text not null check (outcome_status in ('solved', 'partially_solved', 'unable_to_verify')),
  outcome_description text not null,
  attempted text not null,
  worked text not null,
  evidence text,
  created_at timestamptz not null default now()
);
create index if not exists solutions_problem_idx on public.solution_reports (problem_id, created_at desc);

create table if not exists public.contributions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  problem_id uuid not null references public.problems (id) on delete cascade,
  solution_id uuid references public.solution_reports (id) on delete set null,
  summary text not null,
  confirmed boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists contributions_user_idx on public.contributions (user_id);

create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Helper functions (security definer avoids recursive RLS checks)
-- ---------------------------------------------------------------------------

create or replace function public.is_problem_member(p_problem uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.problems p where p.id = p_problem and p.owner_id = auth.uid()
  ) or exists (
    select 1 from public.problem_contributors c
    where c.problem_id = p_problem and c.user_id = auth.uid()
  );
$$;

create or replace function public.is_problem_owner(p_problem uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.problems p where p.id = p_problem and p.owner_id = auth.uid()
  );
$$;

create or replace function public.is_connected(a uuid, b uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.connections c
    where c.status = 'accepted'
      and ((c.requester_id = a and c.addressee_id = b) or (c.requester_id = b and c.addressee_id = a))
  );
$$;

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists problems_touch on public.problems;
create trigger problems_touch before update on public.problems
for each row execute function public.touch_updated_at();

drop trigger if exists profiles_touch on public.profiles;
create trigger profiles_touch before update on public.profiles
for each row execute function public.touch_updated_at();

-- Create a profile automatically for every new auth user.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, onboarding_complete)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data ->> 'full_name', ''), split_part(new.email, '@', 1)),
    false
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.user_skills enable row level security;
alter table public.problems enable row level security;
alter table public.comments enable row level security;
alter table public.comment_helpful enable row level security;
alter table public.connections enable row level security;
alter table public.collaboration_tasks enable row level security;
alter table public.shared_resources enable row level security;
alter table public.problem_contributors enable row level security;
alter table public.solution_reports enable row level security;
alter table public.contributions enable row level security;
alter table public.announcements enable row level security;

-- profiles
drop policy if exists "profiles readable" on public.profiles;
create policy "profiles readable" on public.profiles
  for select using (
    profile_visibility = 'public'
    or id = auth.uid()
    or public.is_connected(id, auth.uid())
  );

drop policy if exists "profiles insert own" on public.profiles;
create policy "profiles insert own" on public.profiles
  for insert with check (id = auth.uid());

drop policy if exists "profiles update own" on public.profiles;
create policy "profiles update own" on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

-- user_skills
drop policy if exists "skills readable" on public.user_skills;
create policy "skills readable" on public.user_skills for select using (true);

drop policy if exists "skills insert own" on public.user_skills;
create policy "skills insert own" on public.user_skills
  for insert with check (user_id = auth.uid());

drop policy if exists "skills update own" on public.user_skills;
create policy "skills update own" on public.user_skills
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "skills delete own" on public.user_skills;
create policy "skills delete own" on public.user_skills
  for delete using (user_id = auth.uid());

-- problems
drop policy if exists "problems readable" on public.problems;
create policy "problems readable" on public.problems for select using (true);

drop policy if exists "problems insert own" on public.problems;
create policy "problems insert own" on public.problems
  for insert with check (owner_id = auth.uid());

drop policy if exists "problems update own" on public.problems;
create policy "problems update own" on public.problems
  for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());

drop policy if exists "problems delete own" on public.problems;
create policy "problems delete own" on public.problems
  for delete using (owner_id = auth.uid());

-- comments
drop policy if exists "comments readable" on public.comments;
create policy "comments readable" on public.comments for select using (true);

drop policy if exists "comments insert own" on public.comments;
create policy "comments insert own" on public.comments
  for insert with check (author_id = auth.uid());

drop policy if exists "comments update own" on public.comments;
create policy "comments update own" on public.comments
  for update using (author_id = auth.uid()) with check (author_id = auth.uid());

drop policy if exists "comments delete own" on public.comments;
create policy "comments delete own" on public.comments
  for delete using (author_id = auth.uid());

-- comment_helpful
drop policy if exists "helpful readable" on public.comment_helpful;
create policy "helpful readable" on public.comment_helpful for select using (true);

drop policy if exists "helpful insert own" on public.comment_helpful;
create policy "helpful insert own" on public.comment_helpful
  for insert with check (user_id = auth.uid());

drop policy if exists "helpful delete own" on public.comment_helpful;
create policy "helpful delete own" on public.comment_helpful
  for delete using (user_id = auth.uid());

-- connections
drop policy if exists "connections visible to participants" on public.connections;
create policy "connections visible to participants" on public.connections
  for select using (requester_id = auth.uid() or addressee_id = auth.uid());

drop policy if exists "connections insert own" on public.connections;
create policy "connections insert own" on public.connections
  for insert with check (requester_id = auth.uid() and status = 'pending');

drop policy if exists "connections respond" on public.connections;
create policy "connections respond" on public.connections
  for update using (addressee_id = auth.uid()) with check (addressee_id = auth.uid());

drop policy if exists "connections delete participant" on public.connections;
create policy "connections delete participant" on public.connections
  for delete using (requester_id = auth.uid() or addressee_id = auth.uid());

-- collaboration_tasks (workspace members only)
drop policy if exists "tasks readable by members" on public.collaboration_tasks;
create policy "tasks readable by members" on public.collaboration_tasks
  for select using (public.is_problem_member(problem_id));

drop policy if exists "tasks insert by members" on public.collaboration_tasks;
create policy "tasks insert by members" on public.collaboration_tasks
  for insert with check (public.is_problem_member(problem_id) and created_by = auth.uid());

drop policy if exists "tasks update by members" on public.collaboration_tasks;
create policy "tasks update by members" on public.collaboration_tasks
  for update using (public.is_problem_member(problem_id));

drop policy if exists "tasks delete by members" on public.collaboration_tasks;
create policy "tasks delete by members" on public.collaboration_tasks
  for delete using (public.is_problem_member(problem_id));

-- shared_resources (workspace members only)
drop policy if exists "resources readable by members" on public.shared_resources;
create policy "resources readable by members" on public.shared_resources
  for select using (public.is_problem_member(problem_id));

drop policy if exists "resources insert by members" on public.shared_resources;
create policy "resources insert by members" on public.shared_resources
  for insert with check (public.is_problem_member(problem_id) and added_by = auth.uid());

drop policy if exists "resources delete by members" on public.shared_resources;
create policy "resources delete by members" on public.shared_resources
  for delete using (public.is_problem_member(problem_id));

-- problem_contributors (public roster, owner-controlled)
drop policy if exists "contributors readable" on public.problem_contributors;
create policy "contributors readable" on public.problem_contributors for select using (true);

drop policy if exists "contributors insert by owner" on public.problem_contributors;
create policy "contributors insert by owner" on public.problem_contributors
  for insert with check (public.is_problem_owner(problem_id));

drop policy if exists "contributors update by owner" on public.problem_contributors;
create policy "contributors update by owner" on public.problem_contributors
  for update using (public.is_problem_owner(problem_id));

drop policy if exists "contributors delete by owner" on public.problem_contributors;
create policy "contributors delete by owner" on public.problem_contributors
  for delete using (public.is_problem_owner(problem_id));

-- solution_reports (public, owner-authored)
drop policy if exists "solutions readable" on public.solution_reports;
create policy "solutions readable" on public.solution_reports for select using (true);

drop policy if exists "solutions insert by owner" on public.solution_reports;
create policy "solutions insert by owner" on public.solution_reports
  for insert with check (public.is_problem_owner(problem_id) and author_id = auth.uid());

drop policy if exists "solutions update by owner" on public.solution_reports;
create policy "solutions update by owner" on public.solution_reports
  for update using (author_id = auth.uid() and public.is_problem_owner(problem_id));

-- contributions (written only by the problem owner)
drop policy if exists "contributions readable" on public.contributions;
create policy "contributions readable" on public.contributions for select using (true);

drop policy if exists "contributions insert by owner" on public.contributions;
create policy "contributions insert by owner" on public.contributions
  for insert with check (public.is_problem_owner(problem_id) and confirmed = true);

drop policy if exists "contributions update by owner" on public.contributions;
create policy "contributions update by owner" on public.contributions
  for update using (public.is_problem_owner(problem_id));

drop policy if exists "contributions delete by owner" on public.contributions;
create policy "contributions delete by owner" on public.contributions
  for delete using (public.is_problem_owner(problem_id));

-- announcements (read-only for everyone)
drop policy if exists "announcements readable" on public.announcements;
create policy "announcements readable" on public.announcements for select using (true);

-- ---------------------------------------------------------------------------
-- Storage (optional attachment bucket; the UI currently accepts links)
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('attachments', 'attachments', true)
on conflict (id) do nothing;

drop policy if exists "attachments public read" on storage.objects;
create policy "attachments public read" on storage.objects
  for select using (bucket_id = 'attachments');

drop policy if exists "attachments authenticated write" on storage.objects;
create policy "attachments authenticated write" on storage.objects
  for insert to authenticated with check (bucket_id = 'attachments');
