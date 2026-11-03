-- 16-migratsiya: fayllar (pasport, galereya) uchun kichik nusxa — profil ochilganda katta rasm yuklanmaydi,
-- faqat bosilganda. Mavjud ma'lumot o'zgarmaydi, faqat `kichik` ustuni qo'shiladi.

alter table public.xodim_fayllar add column if not exists kichik text;
alter table public.ariza_fayllar add column if not exists kichik text;

-- Admin ro'yxati: kichik nusxa (bo'lmasa eski to'liq rasm). RLS asosiy jadvaldan (security_invoker).
create or replace view public.xodim_fayllar_k with (security_invoker = true) as
  select id, xodim_id, turi, idx, coalesce(kichik, data) as kichik, created_at from public.xodim_fayllar;
create or replace view public.ariza_fayllar_k with (security_invoker = true) as
  select id, ariza_id, turi, idx, coalesce(kichik, data) as kichik, created_at from public.ariza_fayllar;
grant select on public.xodim_fayllar_k, public.ariza_fayllar_k to authenticated;

-- Ochiq rejim: galereya kichik nusxada; to'liq rasm alohida
create or replace function public.xodim_rasmlar_ochiq(p_id text) returns json
language sql stable security definer set search_path = public as $$
  select coalesce(json_agg(json_build_object('id', f.id, 'turi', f.turi, 'idx', f.idx, 'kichik', coalesce(f.kichik, f.data)) order by f.idx), '[]'::json)
  from public.xodim_fayllar f join public.xodimlar x on x.id = f.xodim_id
  where f.xodim_id = p_id and f.turi = 'rasm' and not (x.data ? 'arxiv')
$$;
create or replace function public.xodim_rasm_ochiq(p_id bigint) returns text
language sql stable security definer set search_path = public as $$
  select f.data from public.xodim_fayllar f join public.xodimlar x on x.id = f.xodim_id
  where f.id = p_id and f.turi = 'rasm' and not (x.data ? 'arxiv')
$$;
revoke all on function public.xodim_rasm_ochiq(bigint) from public;
grant execute on function public.xodim_rasm_ochiq(bigint) to anon, authenticated;

-- Shaxsiy havola
create or replace function public.xodim_fayllar_olish(p_token text) returns json
language sql stable security definer set search_path = public as $$
  select coalesce(json_agg(json_build_object('id', f.id, 'turi', f.turi, 'idx', f.idx, 'kichik', coalesce(f.kichik, f.data)) order by f.turi, f.idx), '[]'::json)
  from public.xodim_fayllar f join public.xodimlar x on x.id = f.xodim_id
  where x.token = p_token and not (x.data ? 'arxiv')
$$;
create or replace function public.xodim_fayl_olish(p_token text, p_id bigint) returns text
language sql stable security definer set search_path = public as $$
  select f.data from public.xodim_fayllar f join public.xodimlar x on x.id = f.xodim_id
  where f.id = p_id and x.token = p_token and not (x.data ? 'arxiv')
$$;
revoke all on function public.xodim_fayl_olish(text, bigint) from public;
grant execute on function public.xodim_fayl_olish(text, bigint) to anon, authenticated;

-- Saqlash: p_kichik ixtiyoriy (eski ilova 4 argument bilan chaqirsa ham ishlaydi)
drop function public.xodim_fayl_saqlash(text, text, int, text);
create function public.xodim_fayl_saqlash(p_token text, p_turi text, p_idx int, p_data text, p_kichik text default null) returns json
language plpgsql security definer set search_path = public as $$
declare v_xid text; v_id bigint;
begin
  if p_turi not in ('rasm', 'pasport_old', 'pasport_orqa') then return json_build_object('ok', false, 'xato', 'Fayl turi noto''g''ri'); end if;
  if length(p_data) > 900000 or length(p_kichik) > 100000 then return json_build_object('ok', false, 'xato', 'Rasm juda katta'); end if;
  if p_turi = 'rasm' and (p_idx < 0 or p_idx > 4) then return json_build_object('ok', false, 'xato', 'Eng ko''pi 5 ta rasm'); end if;
  select id into v_xid from public.xodimlar where token = p_token and not (data ? 'arxiv');
  if v_xid is null then return json_build_object('ok', false, 'xato', 'Havola topilmadi yoki faol emas'); end if;
  insert into public.xodim_fayllar (xodim_id, turi, idx, data, kichik) values (v_xid, p_turi, p_idx, p_data, p_kichik)
    on conflict (xodim_id, turi, idx) do update set data = excluded.data, kichik = excluded.kichik, created_at = now() returning id into v_id;
  return json_build_object('ok', true, 'id', v_id);
end $$;
revoke all on function public.xodim_fayl_saqlash(text, text, int, text, text) from public;
grant execute on function public.xodim_fayl_saqlash(text, text, int, text, text) to anon, authenticated;

-- Chala havola
create or replace function public.toldirish_fayllar_olish(p_token text) returns json
language plpgsql stable security definer set search_path = public as $$
declare h public.toldirish_havolalari;
begin
  select * into h from public.toldirish_havolalari where token = p_token;
  if not found or h.used_at is not null then return '[]'::json; end if;
  if h.xodim_id is not null then
    return (select coalesce(json_agg(json_build_object('id', id, 'turi', turi, 'idx', idx, 'kichik', coalesce(kichik, data)) order by turi, idx), '[]'::json) from public.xodim_fayllar where xodim_id = h.xodim_id);
  else
    return (select coalesce(json_agg(json_build_object('id', id, 'turi', turi, 'idx', idx, 'kichik', coalesce(kichik, data)) order by turi, idx), '[]'::json) from public.ariza_fayllar where ariza_id = h.ariza_id);
  end if;
end $$;
create or replace function public.toldirish_fayl_olish(p_token text, p_id bigint) returns text
language plpgsql stable security definer set search_path = public as $$
declare h public.toldirish_havolalari;
begin
  select * into h from public.toldirish_havolalari where token = p_token;
  if not found or h.used_at is not null then return null; end if;
  if h.xodim_id is not null then return (select data from public.xodim_fayllar where id = p_id and xodim_id = h.xodim_id);
  else return (select data from public.ariza_fayllar where id = p_id and ariza_id = h.ariza_id); end if;
end $$;
revoke all on function public.toldirish_fayl_olish(text, bigint) from public;
grant execute on function public.toldirish_fayl_olish(text, bigint) to anon, authenticated;

drop function public.toldirish_fayl_saqlash(text, text, int, text);
create function public.toldirish_fayl_saqlash(p_token text, p_turi text, p_idx int, p_data text, p_kichik text default null) returns json
language plpgsql security definer set search_path = public as $$
declare h public.toldirish_havolalari; v_id bigint;
begin
  if p_turi not in ('rasm', 'pasport_old', 'pasport_orqa') then return json_build_object('ok', false, 'xato', 'Fayl turi noto''g''ri'); end if;
  if length(p_data) > 900000 or length(p_kichik) > 100000 then return json_build_object('ok', false, 'xato', 'Rasm juda katta'); end if;
  if p_turi = 'rasm' and (p_idx < 0 or p_idx > 4) then return json_build_object('ok', false, 'xato', 'Eng ko''pi 5 ta rasm'); end if;
  select * into h from public.toldirish_havolalari where token = p_token;
  if not found then return json_build_object('ok', false, 'xato', 'Havola topilmadi'); end if;
  if h.used_at is not null then return json_build_object('ok', false, 'xato', 'Havola allaqachon ishlatilgan'); end if;
  if h.xodim_id is not null then
    insert into public.xodim_fayllar (xodim_id, turi, idx, data, kichik) values (h.xodim_id, p_turi, p_idx, p_data, p_kichik)
      on conflict (xodim_id, turi, idx) do update set data = excluded.data, kichik = excluded.kichik, created_at = now() returning id into v_id;
  else
    insert into public.ariza_fayllar (ariza_id, turi, idx, data, kichik) values (h.ariza_id, p_turi, p_idx, p_data, p_kichik)
      on conflict (ariza_id, turi, idx) do update set data = excluded.data, kichik = excluded.kichik, created_at = now() returning id into v_id;
  end if;
  return json_build_object('ok', true, 'id', v_id);
end $$;
revoke all on function public.toldirish_fayl_saqlash(text, text, int, text, text) from public;
grant execute on function public.toldirish_fayl_saqlash(text, text, int, text, text) to anon, authenticated;

-- Ochiq forma: fayl elementida ixtiyoriy `kichik`
create or replace function public.anketa_yuborish(p_data jsonb, p_fayllar jsonb) returns json
language plpgsql security definer set search_path = public as $$
declare r json; v_id uuid; f jsonb; n int := 0; total int := 0;
begin
  if p_fayllar is not null and jsonb_typeof(p_fayllar) = 'array' then
    if jsonb_array_length(p_fayllar) > 7 then return json_build_object('ok', false, 'xato', 'Fayllar soni ko''p (eng ko''pi 7)'); end if;
    for f in select * from jsonb_array_elements(p_fayllar) loop
      if (f ->> 'turi') not in ('rasm', 'pasport_old', 'pasport_orqa') then return json_build_object('ok', false, 'xato', 'Fayl turi noto''g''ri'); end if;
      if length(f ->> 'data') > 900000 or length(f ->> 'kichik') > 100000 then return json_build_object('ok', false, 'xato', 'Rasm juda katta'); end if;
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
      insert into public.ariza_fayllar (ariza_id, turi, idx, data, kichik) values (v_id, f ->> 'turi', coalesce((f ->> 'idx')::int, n), f ->> 'data', f ->> 'kichik')
        on conflict (ariza_id, turi, idx) do update set data = excluded.data, kichik = excluded.kichik;
      n := n + 1;
    end loop;
  end if;
  return r;
end $$;

select count(*) as fayllar_jami, count(kichik) as kichik_bor from public.xodim_fayllar;
