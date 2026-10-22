-- 2-migratsiya: adminlar, tokenlar, taklif havolalari, RLS, RPC (2026-10-22)
create extension if not exists pgcrypto;

-- Adminlar (HR) ruxsat ro'yxati
create table if not exists public.adminlar (
  email text primary key,
  created_at timestamptz not null default now()
);
insert into public.adminlar(email) values ('rustamasaka1991@gmail.com') on conflict do nothing;
alter table public.adminlar enable row level security;

-- Xodimning shaxsiy havola tokeni
alter table public.xodimlar add column if not exists token text unique default encode(gen_random_bytes(16), 'hex');
update public.xodimlar set token = encode(gen_random_bytes(16), 'hex') where token is null;

-- Taklif havolalari (HR yaratadi, yangi xodim to'ldiradi)
create table if not exists public.havolalar (
  token text primary key default encode(gen_random_bytes(16), 'hex'),
  bolim text not null,
  lavozim text not null default '',
  rahbar text not null default '',
  guruh text not null default '',
  izoh text not null default '',
  created_at timestamptz not null default now(),
  used_by text,
  used_at timestamptz
);
alter table public.havolalar enable row level security;
alter table public.havolalar replica identity full;

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.adminlar where email = lower(coalesce(auth.jwt() ->> 'email', '')))
$$;

-- Eski ochiq siyosatlarni olib tashlab, faqat admin uchun qoldiramiz
drop policy if exists uzgrow_all on public.bolimlar;
drop policy if exists uzgrow_all on public.xodimlar;
drop policy if exists uzgrow_all on public.sozlamalar;
drop policy if exists admin_all on public.bolimlar;
drop policy if exists admin_all on public.xodimlar;
drop policy if exists admin_all on public.sozlamalar;
drop policy if exists admin_all on public.havolalar;
drop policy if exists admin_read on public.adminlar;
create policy admin_all on public.bolimlar for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy admin_all on public.xodimlar for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy admin_all on public.sozlamalar for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy admin_all on public.havolalar for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy admin_read on public.adminlar for select to authenticated using (public.is_admin());

do $$ begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'havolalar') then
    alter publication supabase_realtime add table public.havolalar;
  end if;
end $$;

-- Xodim o'zi o'zgartira oladigan maydonlar
create or replace function public.xodim_birlashtir(p_old jsonb, p_new jsonb) returns jsonb
language sql immutable as $$
  select coalesce(p_old, '{}'::jsonb) || coalesce((
    select jsonb_object_agg(key, value) from jsonb_each(coalesce(p_new, '{}'::jsonb))
    where key in ('ism', 'foto', 'shaxsiy', 'talim', 'mehnat', 'oila', 'shaxsiyat', 'hobbi', 'maqsad', 'takliflar')
  ), '{}'::jsonb)
$$;

-- Taklif havolasi haqida ma'lumot (anon)
create or replace function public.havola_info(p_token text) returns json
language plpgsql stable security definer set search_path = public as $$
declare h public.havolalar; b public.bolimlar; r public.xodimlar; x public.xodimlar;
begin
  select * into h from public.havolalar where token = p_token;
  if not found then return json_build_object('ok', false, 'xato', 'Havola topilmadi yoki o''chirilgan'); end if;
  select * into b from public.bolimlar where id = h.bolim;
  select * into r from public.xodimlar where id = h.rahbar;
  if h.used_by is not null then select * into x from public.xodimlar where id = h.used_by; end if;
  return json_build_object('ok', true, 'used', h.used_by is not null,
    'bolim', h.bolim, 'bolim_nomi', coalesce(b.data ->> 'nomi', h.bolim), 'bolim_rang', coalesce(b.data ->> 'rang', '#1d7a3e'),
    'lavozim', h.lavozim, 'guruh', h.guruh, 'izoh', h.izoh, 'rahbar_ism', r.data ->> 'ism', 'xodim_token', x.token);
end $$;

-- Taklif havolasi orqali yangi xodim yaratish (anon)
create or replace function public.havola_toldirish(p_token text, p_id text, p_data jsonb) returns json
language plpgsql security definer set search_path = public as $$
declare h public.havolalar; v_id text; v_base text; n int := 2; v_data jsonb; v_token text;
begin
  if pg_column_size(p_data) > 1500000 then return json_build_object('ok', false, 'xato', 'Ma''lumot juda katta (rasm hajmini kamaytiring)'); end if;
  select * into h from public.havolalar where token = p_token for update;
  if not found then return json_build_object('ok', false, 'xato', 'Havola topilmadi'); end if;
  if h.used_by is not null then return json_build_object('ok', false, 'xato', 'Bu havola allaqachon ishlatilgan'); end if;
  if coalesce(p_data ->> 'ism', '') = '' then return json_build_object('ok', false, 'xato', 'Ism kiritilmagan'); end if;
  v_base := case when p_id ~ '^[a-z0-9-]{1,40}$' then p_id else 'xodim' end;
  v_id := v_base;
  while exists (select 1 from public.xodimlar where id = v_id) loop v_id := v_base || '-' || n; n := n + 1; end loop;
  v_data := public.xodim_birlashtir('{}'::jsonb, p_data) || jsonb_build_object(
    'id', v_id, 'bolim', h.bolim, 'rahbar', h.rahbar, 'guruh', h.guruh,
    'lavozim', coalesce(nullif(h.lavozim, ''), p_data ->> 'lavozim', ''));
  insert into public.xodimlar (id, data, tartib) values (v_id, v_data, (select coalesce(max(tartib), -1) + 1 from public.xodimlar))
    returning token into v_token;
  update public.havolalar set used_by = v_id, used_at = now() where token = p_token;
  return json_build_object('ok', true, 'id', v_id, 'token', v_token);
end $$;

-- Xodim o'z anketasini olish (anon, shaxsiy token bilan)
create or replace function public.xodim_olish(p_token text) returns json
language plpgsql stable security definer set search_path = public as $$
declare x public.xodimlar; b public.bolimlar; r public.xodimlar;
begin
  if coalesce(p_token, '') = '' then return json_build_object('ok', false, 'xato', 'Token yo''q'); end if;
  select * into x from public.xodimlar where token = p_token;
  if not found then return json_build_object('ok', false, 'xato', 'Havola topilmadi. HR dan yangi havola so''rang.'); end if;
  select * into b from public.bolimlar where id = x.data ->> 'bolim';
  select * into r from public.xodimlar where id = x.data ->> 'rahbar';
  return json_build_object('ok', true, 'xodim', x.data, 'bolim_nomi', b.data ->> 'nomi', 'bolim_rang', coalesce(b.data ->> 'rang', '#1d7a3e'), 'rahbar_ism', r.data ->> 'ism');
end $$;

-- Xodim o'z anketasini saqlash (anon, shaxsiy token bilan)
create or replace function public.xodim_saqlash(p_token text, p_data jsonb) returns json
language plpgsql security definer set search_path = public as $$
declare v jsonb;
begin
  if pg_column_size(p_data) > 1500000 then return json_build_object('ok', false, 'xato', 'Ma''lumot juda katta (rasm hajmini kamaytiring)'); end if;
  update public.xodimlar set data = public.xodim_birlashtir(data, p_data), updated_at = now() where token = p_token returning data into v;
  if not found then return json_build_object('ok', false, 'xato', 'Havola topilmadi'); end if;
  return json_build_object('ok', true, 'xodim', v);
end $$;

revoke all on function public.havola_info(text) from public;
revoke all on function public.havola_toldirish(text, text, jsonb) from public;
revoke all on function public.xodim_olish(text) from public;
revoke all on function public.xodim_saqlash(text, jsonb) from public;
grant execute on function public.havola_info(text) to anon, authenticated;
grant execute on function public.havola_toldirish(text, text, jsonb) to anon, authenticated;
grant execute on function public.xodim_olish(text) to anon, authenticated;
grant execute on function public.xodim_saqlash(text, jsonb) to anon, authenticated;
grant execute on function public.is_admin() to anon, authenticated;

select tablename, policyname, roles from pg_policies where schemaname = 'public' order by 1, 2;
