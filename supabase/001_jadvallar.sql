-- 1-migratsiya: jadvallar, realtime (2026-10-22)
create table if not exists public.bolimlar (
  id text primary key,
  data jsonb not null,
  tartib integer not null default 0,
  updated_at timestamptz not null default now()
);
create table if not exists public.xodimlar (
  id text primary key,
  data jsonb not null,
  tartib integer not null default 0,
  updated_at timestamptz not null default now()
);
create table if not exists public.sozlamalar (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.bolimlar enable row level security;
alter table public.xodimlar enable row level security;
alter table public.sozlamalar enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where tablename='bolimlar' and policyname='uzgrow_all') then
    create policy uzgrow_all on public.bolimlar for all to anon, authenticated using (true) with check (true);
  end if;
  if not exists (select 1 from pg_policies where tablename='xodimlar' and policyname='uzgrow_all') then
    create policy uzgrow_all on public.xodimlar for all to anon, authenticated using (true) with check (true);
  end if;
  if not exists (select 1 from pg_policies where tablename='sozlamalar' and policyname='uzgrow_all') then
    create policy uzgrow_all on public.sozlamalar for all to anon, authenticated using (true) with check (true);
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and tablename='bolimlar') then
    alter publication supabase_realtime add table public.bolimlar;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and tablename='xodimlar') then
    alter publication supabase_realtime add table public.xodimlar;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and tablename='sozlamalar') then
    alter publication supabase_realtime add table public.sozlamalar;
  end if;
end $$;

alter table public.bolimlar replica identity full;
alter table public.xodimlar replica identity full;
alter table public.sozlamalar replica identity full;
