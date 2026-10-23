-- 6-migratsiya: ochiq anketa (arizalar), sinov muddati bo'limi, taklif havolalarini olib tashlash

-- 1) Sinov muddatidagilar bo'limi
insert into public.bolimlar (id, data, tartib)
select 'sinov', jsonb_build_object('id', 'sinov', 'nomi', 'Sinov muddatidagilar', 'rang', '#b8860b',
  'vazifalar', jsonb_build_array('Yangi xodimlarning sinov muddati (odatda 1-3 oy)', 'Rahbar va HR kuzatuvi, oraliq baholash', 'Sinov yakunida doimiy bo''limga o''tkazish yoki xayrlashish')),
  coalesce((select max(tartib) + 1 from public.bolimlar), 0)
where not exists (select 1 from public.bolimlar where id = 'sinov');

-- 2) To'ldirilgan anketalar (HR ko'rib chiqadi)
create table if not exists public.arizalar (
  id uuid primary key default gen_random_uuid(),
  data jsonb not null,
  holat text not null default 'yangi',       -- yangi | qabul | rad
  xodim_id text,
  izoh text not null default '',
  ip text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.arizalar enable row level security;
drop policy if exists admin_all on public.arizalar;
create policy admin_all on public.arizalar for all to authenticated using (public.is_admin()) with check (public.is_admin());
alter table public.arizalar replica identity full;
do $$ begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'arizalar') then
    alter publication supabase_realtime add table public.arizalar;
  end if;
end $$;

-- Spamga qarshi: bir IP dan soatiga 5 ta
create table if not exists public.ariza_limit (
  ip text primary key,
  soni int not null default 0,
  boshi timestamptz not null default now()
);
alter table public.ariza_limit enable row level security;

create or replace function public.anketa_yuborish(p_data jsonb) returns json
language plpgsql security definer set search_path = public as $$
declare v_ip text; v_cnt int; v_id uuid; v_clean jsonb;
begin
  if pg_column_size(p_data) > 1500000 then return json_build_object('ok', false, 'xato', 'Ma''lumot juda katta (rasm hajmini kamaytiring)'); end if;
  if coalesce(trim(p_data ->> 'ism'), '') = '' then return json_build_object('ok', false, 'xato', 'Ism-sharif kiritilmagan'); end if;
  -- honeypot: botlar to'ldiradigan yashirin maydon
  if coalesce(p_data ->> 'website', '') <> '' then return json_build_object('ok', true, 'id', gen_random_uuid()); end if;

  v_ip := split_part(coalesce(current_setting('request.headers', true)::json ->> 'x-forwarded-for', 'nomalum'), ',', 1);
  insert into public.ariza_limit (ip, soni, boshi) values (v_ip, 1, now())
    on conflict (ip) do update set
      soni = case when public.ariza_limit.boshi < now() - interval '1 hour' then 1 else public.ariza_limit.soni + 1 end,
      boshi = case when public.ariza_limit.boshi < now() - interval '1 hour' then now() else public.ariza_limit.boshi end
    returning soni into v_cnt;
  if v_cnt > 5 then return json_build_object('ok', false, 'xato', 'Juda ko''p urinish. Birozdan keyin qayta urinib ko''ring.'); end if;

  -- faqat anketa maydonlari saqlanadi
  v_clean := (select coalesce(jsonb_object_agg(key, value), '{}'::jsonb) from jsonb_each(p_data)
              where key in ('ism', 'foto', 'shaxsiy', 'talim', 'mehnat', 'oila', 'shaxsiyat', 'hobbi', 'maqsad'));
  insert into public.arizalar (data, ip) values (v_clean, v_ip) returning id into v_id;
  return json_build_object('ok', true, 'id', v_id);
end $$;
revoke all on function public.anketa_yuborish(jsonb) from public;
grant execute on function public.anketa_yuborish(jsonb) to anon, authenticated;

-- 3) Eski taklif havolalari olib tashlanadi
drop function if exists public.havola_info(text);
drop function if exists public.havola_toldirish(text, text, jsonb);
drop table if exists public.havolalar;

select (select count(*) from public.bolimlar) as bolimlar, (select count(*) from public.arizalar) as arizalar,
       exists(select 1 from pg_proc where proname = 'anketa_yuborish') as rpc_bor, not exists(select 1 from pg_tables where tablename = 'havolalar') as havolalar_yoq;
