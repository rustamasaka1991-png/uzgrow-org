-- 12-migratsiya: chala-havola orqali fayllar (pasport, rasmlar) ham yuklanadi

create or replace function public.toldirish_fayllar_olish(p_token text) returns json
language plpgsql stable security definer set search_path = public as $$
declare h public.toldirish_havolalari;
begin
  select * into h from public.toldirish_havolalari where token = p_token;
  if not found or h.used_at is not null then return '[]'::json; end if;
  if h.xodim_id is not null then
    return (select coalesce(json_agg(json_build_object('id', id, 'turi', turi, 'idx', idx, 'data', data) order by turi, idx), '[]'::json) from public.xodim_fayllar where xodim_id = h.xodim_id);
  else
    return (select coalesce(json_agg(json_build_object('id', id, 'turi', turi, 'idx', idx, 'data', data) order by turi, idx), '[]'::json) from public.ariza_fayllar where ariza_id = h.ariza_id);
  end if;
end $$;

create or replace function public.toldirish_fayl_saqlash(p_token text, p_turi text, p_idx int, p_data text) returns json
language plpgsql security definer set search_path = public as $$
declare h public.toldirish_havolalari; v_id bigint;
begin
  if p_turi not in ('rasm', 'pasport_old', 'pasport_orqa') then return json_build_object('ok', false, 'xato', 'Fayl turi noto''g''ri'); end if;
  if length(p_data) > 900000 then return json_build_object('ok', false, 'xato', 'Rasm juda katta'); end if;
  if p_turi = 'rasm' and (p_idx < 0 or p_idx > 4) then return json_build_object('ok', false, 'xato', 'Eng ko''pi 5 ta rasm'); end if;
  select * into h from public.toldirish_havolalari where token = p_token;
  if not found then return json_build_object('ok', false, 'xato', 'Havola topilmadi'); end if;
  if h.used_at is not null then return json_build_object('ok', false, 'xato', 'Havola allaqachon ishlatilgan'); end if;
  if h.xodim_id is not null then
    insert into public.xodim_fayllar (xodim_id, turi, idx, data) values (h.xodim_id, p_turi, p_idx, p_data)
      on conflict (xodim_id, turi, idx) do update set data = excluded.data, created_at = now() returning id into v_id;
  else
    insert into public.ariza_fayllar (ariza_id, turi, idx, data) values (h.ariza_id, p_turi, p_idx, p_data)
      on conflict (ariza_id, turi, idx) do update set data = excluded.data, created_at = now() returning id into v_id;
  end if;
  return json_build_object('ok', true, 'id', v_id);
end $$;

create or replace function public.toldirish_fayl_ochirish(p_token text, p_id bigint) returns json
language plpgsql security definer set search_path = public as $$
declare h public.toldirish_havolalari;
begin
  select * into h from public.toldirish_havolalari where token = p_token;
  if not found or h.used_at is not null then return json_build_object('ok', false, 'xato', 'Havola faol emas'); end if;
  if h.xodim_id is not null then delete from public.xodim_fayllar where id = p_id and xodim_id = h.xodim_id;
  else delete from public.ariza_fayllar where id = p_id and ariza_id = h.ariza_id; end if;
  return json_build_object('ok', true);
end $$;

revoke all on function public.toldirish_fayllar_olish(text) from public;
revoke all on function public.toldirish_fayl_saqlash(text, text, int, text) from public;
revoke all on function public.toldirish_fayl_ochirish(text, bigint) from public;
grant execute on function public.toldirish_fayllar_olish(text) to anon, authenticated;
grant execute on function public.toldirish_fayl_saqlash(text, text, int, text) to anon, authenticated;
grant execute on function public.toldirish_fayl_ochirish(text, bigint) to anon, authenticated;

-- toldirish_yuborish: fayl kalitlari ('pasport_old','pasport_orqa','rasmlar') e'tiborsiz qoladi (ular alohida saqlangan)
select count(*) as funksiyalar from pg_proc where proname in ('toldirish_fayllar_olish','toldirish_fayl_saqlash','toldirish_fayl_ochirish');
