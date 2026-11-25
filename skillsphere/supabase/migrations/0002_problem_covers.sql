-- Cover images for problems (challenge cards).
alter table public.problems add column if not exists cover_url text;
