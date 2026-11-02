-- 14-migratsiya: tezlik вЂ” ochiq tuzilma katta rasmsiz (foto_kichik 96px bilan)

create or replace function public.tuzilma_ochiq() returns json
language sql stable security definer set search_path = public as $$
  select json_build_object(
    'bolimlar', (
      select coalesce(json_agg(json_build_object(
        'id', id, 'nomi', data ->> 'nomi', 'rang', data ->> 'rang', 'vazifalar', coalesce(data -> 'vazifalar', '[]'::jsonb)
      ) order by tartib), '[]'::json) from public.bolimlar),
    'xodimlar', (
      select coalesce(json_agg(((data - 'foto') || jsonb_build_object('id', id)) order by tartib), '[]'::json)
      from public.xodimlar where not (data ? 'arxiv')),
    'ceoId', (select value from public.sozlamalar where key = 'ceoId')
  )
$$;

-- xodim o'zi saqlaganda foto_kichik ham o'tadi
create or replace function public.xodim_birlashtir(p_old jsonb, p_new jsonb) returns jsonb
language plpgsql immutable as $$
declare v jsonb; t jsonb; o jsonb; arr jsonb := '[]'::jsonb;
begin
  v := coalesce(p_old, '{}'::jsonb) || coalesce((
    select jsonb_object_agg(key, value) from jsonb_each(coalesce(p_new, '{}'::jsonb))
    where key in ('ism', 'foto', 'foto_kichik', 'shaxsiy', 'talim', 'mehnat', 'oila', 'shaxsiyat', 'hobbi', 'maqsad', 'rivojlanish')
  ), '{}'::jsonb);
  if p_new ? 'takliflar' and jsonb_typeof(p_new -> 'takliflar') = 'array' then
    for t in select * from jsonb_array_elements(p_new -> 'takliflar') loop
      select e into o from jsonb_array_elements(coalesce(p_old -> 'takliflar', '[]'::jsonb)) e where e ->> 'id' = t ->> 'id' limit 1;
      if o is not null then arr := arr || jsonb_build_array(t || jsonb_build_object('holat', coalesce(o ->> 'holat', 'Yangi')));
      else arr := arr || jsonb_build_array(t || jsonb_build_object('holat', 'Yangi')); end if;
    end loop;
    v := v || jsonb_build_object('takliflar', arr);
  end if;
  return v;
end $$;

-- chala havola orqali foto_kichik ham
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
  for k in select * from (select jsonb_array_elements_text(h.maydonlar) union select 'foto_kichik' where h.maydonlar ? 'foto') s loop
    if k !~ '^[a-zA-Z_.0-9]+$' or split_part(k, '.', 1) not in ('ism','foto','foto_kichik','shaxsiy','talim','mehnat','oila','shaxsiyat','hobbi','maqsad','rivojlanish') then continue; end if;
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

select length(public.tuzilma_ochiq()::text) as ochiq_bayt;
