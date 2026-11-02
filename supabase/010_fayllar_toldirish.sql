-- 11-migratsiya: fayllar (rasmlar, pasport) alohida jadvallarda; chala anketa uchun bir martalik havolalar

-- 1) Anketa fayllari (HR ochganda yuklanadi)
create table if not exists public.ariza_fayllar (
  id bigserial primary key,
  ariza_id uuid not null references public.arizalar(id) on delete cascade,
  turi text not null check (turi in ('rasm', 'pasport_old', 'pasport_orqa')),
  idx int not null default 0,
  data text not null,
  created_at timestamptz not null default now(),
  unique (ariza_id, turi, idx)
);
alter table public.ariza_fayllar enable row level security;
drop policy if exists admin_all on public.ariza_fayllar;
create policy admin_all on public.ariza_fayllar for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- 2) Xodim fayllari (profil ochilganda yuklanadi)
create table if not exists public.xodim_fayllar (
  id bigserial primary key,
  xodim_id text not null references public.xodimlar(id) on delete cascade,
  turi text not null check (turi in ('rasm', 'pasport_old', 'pasport_orqa')),
  idx int not null default 0,
  data text not null,
  created_at timestamptz not null default now(),
  unique (xodim_id, turi, idx)
);
alter table public.xodim_fayllar enable row level security;
drop policy if exists admin_all on public.xodim_fayllar;
create policy admin_all on public.xodim_fayllar for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- 3) Anketa yuborish вЂ” fayllar bilan
create or replace function public.anketa_yuborish(p_data jsonb, p_fayllar jsonb) returns json
language plpgsql security definer set search_path = public as $$
declare r json; v_id uuid; f jsonb; n int := 0; total int := 0;
begin
  if p_fayllar is not null and jsonb_typeof(p_fayllar) = 'array' then
    if jsonb_array_length(p_fayllar) > 7 then return json_build_object('ok', false, 'xato', 'Fayllar soni ko''p (eng ko''pi 7)'); end if;
    for f in select * from jsonb_array_elements(p_fayllar) loop
      if (f ->> 'turi') not in ('rasm', 'pasport_old', 'pasport_orqa') then return json_build_object('ok', false, 'xato', 'Fayl turi noto''g''ri'); end if;
      if length(f ->> 'data') > 900000 then return json_build_object('ok', false, 'xato', 'Rasm juda katta'); end if;
      total := total + length(f ->> 'data');
    end loop;
    if total > 4000000 then return json_build_object('ok', false, 'xato', 'Rasmlar jami hajmi juda katta'); end if;
  end if;
  r := public.anketa_yuborish(p_data);
  if not (r ->> 'ok')::boolean then return r; end if;
  v_id := (r ->> 'id')::uuid;
  if not exists (select 1 from public.arizalar where id = v_id) then return r; end if; -- honeypot holati
  if p_fayllar is not null and jsonb_typeof(p_fayllar) = 'array' then
    for f in select * from jsonb_array_elements(p_fayllar) loop
      insert into public.ariza_fayllar (ariza_id, turi, idx, data) values (v_id, f ->> 'turi', coalesce((f ->> 'idx')::int, n), f ->> 'data')
        on conflict (ariza_id, turi, idx) do update set data = excluded.data;
      n := n + 1;
    end loop;
  end if;
  return r;
end $$;
revoke all on function public.anketa_yuborish(jsonb, jsonb) from public;
grant execute on function public.anketa_yuborish(jsonb, jsonb) to anon, authenticated;

-- 4) Xodim o'z fayllari (shaxsiy token bilan)
create or replace function public.xodim_fayllar_olish(p_token text) returns json
language sql stable security definer set search_path = public as $$
  select coalesce(json_agg(json_build_object('id', f.id, 'turi', f.turi, 'idx', f.idx, 'data', f.data) order by f.turi, f.idx), '[]'::json)
  from public.xodim_fayllar f join public.xodimlar x on x.id = f.xodim_id
  where x.token = p_token and not (x.data ? 'arxiv')
$$;
create or replace function public.xodim_fayl_saqlash(p_token text, p_turi text, p_idx int, p_data text) returns json
language plpgsql security definer set search_path = public as $$
declare v_xid text; v_id bigint;
begin
  if p_turi not in ('rasm', 'pasport_old', 'pasport_orqa') then return json_build_object('ok', false, 'xato', 'Fayl turi noto''g''ri'); end if;
  if length(p_data) > 900000 then return json_build_object('ok', false, 'xato', 'Rasm juda katta'); end if;
  if p_turi = 'rasm' and (p_idx < 0 or p_idx > 4) then return json_build_object('ok', false, 'xato', 'Eng ko''pi 5 ta rasm'); end if;
  select id into v_xid from public.xodimlar where token = p_token and not (data ? 'arxiv');
  if v_xid is null then return json_build_object('ok', false, 'xato', 'Havola topilmadi yoki faol emas'); end if;
  insert into public.xodim_fayllar (xodim_id, turi, idx, data) values (v_xid, p_turi, p_idx, p_data)
    on conflict (xodim_id, turi, idx) do update set data = excluded.data, created_at = now() returning id into v_id;
  return json_build_object('ok', true, 'id', v_id);
end $$;
create or replace function public.xodim_fayl_ochirish(p_token text, p_id bigint) returns json
language plpgsql security definer set search_path = public as $$
begin
  delete from public.xodim_fayllar f using public.xodimlar x where f.id = p_id and f.xodim_id = x.id and x.token = p_token and not (x.data ? 'arxiv');
  if not found then return json_build_object('ok', false, 'xato', 'Fayl topilmadi'); end if;
  return json_build_object('ok', true);
end $$;
revoke all on function public.xodim_fayllar_olish(text) from public;
revoke all on function public.xodim_fayl_saqlash(text, text, int, text) from public;
revoke all on function public.xodim_fayl_ochirish(text, bigint) from public;
grant execute on function public.xodim_fayllar_olish(text) to anon, authenticated;
grant execute on function public.xodim_fayl_saqlash(text, text, int, text) to anon, authenticated;
grant execute on function public.xodim_fayl_ochirish(text, bigint) to anon, authenticated;

-- 5) Chala anketa uchun bir martalik havola
create table if not exists public.toldirish_havolalari (
  token text primary key default encode(gen_random_bytes(16), 'hex'),
  xodim_id text references public.xodimlar(id) on delete cascade,
  ariza_id uuid references public.arizalar(id) on delete cascade,
  maydonlar jsonb not null,          -- ["shaxsiy.telefon", "talim", "foto", ...]
  created_at timestamptz not null default now(),
  used_at timestamptz
);
alter table public.toldirish_havolalari enable row level security;
drop policy if exists admin_all on public.toldirish_havolalari;
create policy admin_all on public.toldirish_havolalari for all to authenticated using (public.is_admin()) with check (public.is_admin());

create or replace function public.toldirish_info(p_token text) returns json
language plpgsql stable security definer set search_path = public as $$
declare h public.toldirish_havolalari; d jsonb;
begin
  select * into h from public.toldirish_havolalari where token = p_token;
  if not found then return json_build_object('ok', false, 'xato', 'Havola topilmadi'); end if;
  if h.used_at is not null then return json_build_object('ok', false, 'xato', 'Bu havola allaqachon ishlatilgan. Rahmat!'); end if;
  if h.xodim_id is not null then select data into d from public.xodimlar where id = h.xodim_id;
  else select data into d from public.arizalar where id = h.ariza_id; end if;
  if d is null then return json_build_object('ok', false, 'xato', 'Anketa topilmadi'); end if;
  -- faqat so'ralgan maydonlarning hozirgi qiymatlari
  return json_build_object('ok', true, 'ism', d ->> 'ism', 'maydonlar', h.maydonlar,
    'qiymatlar', (select coalesce(jsonb_object_agg(k, case when position('.' in k) > 0 then d #> string_to_array(k, '.') else d -> k end), '{}'::jsonb)
                  from jsonb_array_elements_text(h.maydonlar) k));
end $$;

create or replace function public.toldirish_yuborish(p_token text, p_data jsonb) returns json
language plpgsql security definer set search_path = public as $$
declare h public.toldirish_havolalari; d jsonb; k text; v jsonb; path text[];
begin
  if pg_column_size(p_data) > 1500000 then return json_build_object('ok', false, 'xato', 'Ma''lumot juda katta'); end if;
  select * into h from public.toldirish_havolalari where token = p_token for update;
  if not found then return json_build_object('ok', false, 'xato', 'Havola topilmadi'); end if;
  if h.used_at is not null then return json_build_object('ok', false, 'xato', 'Bu havola allaqachon ishlatilgan'); end if;
  if h.xodim_id is not null then select data into d from public.xodimlar where id = h.xodim_id;
  else select data into d from public.arizalar where id = h.ariza_id; end if;
  if d is null then return json_build_object('ok', false, 'xato', 'Anketa topilmadi'); end if;
  for k in select * from jsonb_array_elements_text(h.maydonlar) loop
    if k !~ '^[a-zA-Z_.0-9]+$' or split_part(k, '.', 1) not in ('ism','foto','shaxsiy','talim','mehnat','oila','shaxsiyat','hobbi','maqsad','rivojlanish') then continue; end if;
    path := string_to_array(k, '.');
    v := p_data #> path;
    if v is null then continue; end if;
    if array_length(path, 1) = 2 and (d -> path[1]) is null then d := jsonb_set(d, array[path[1]], '{}'::jsonb, true); end if;
    d := jsonb_set(d, path, v, true);
  end loop;
  if h.xodim_id is not null then update public.xodimlar set data = d, updated_at = now() where id = h.xodim_id;
  else update public.arizalar set data = d, updated_at = now() where id = h.ariza_id; end if;
  update public.toldirish_havolalari set used_at = now() where token = p_token;
  return json_build_object('ok', true);
end $$;
revoke all on function public.toldirish_info(text) from public;
revoke all on function public.toldirish_yuborish(text, jsonb) from public;
grant execute on function public.toldirish_info(text) to anon, authenticated;
grant execute on function public.toldirish_yuborish(text, jsonb) to anon, authenticated;

-- 6) Zaxiraga fayllar ham kirsin (katta bo'lsa ham) вЂ” yo'q, alohida: faqat xodimlar/bo'limlar (hajm uchun). Tarix: fayl jadvallari yozilmaydi.

select (select count(*) from pg_tables where tablename in ('ariza_fayllar','xodim_fayllar','toldirish_havolalari')) as jadvallar,
       (select count(*) from pg_proc where proname in ('xodim_fayllar_olish','xodim_fayl_saqlash','xodim_fayl_ochirish','toldirish_info','toldirish_yuborish')) as funksiyalar;
