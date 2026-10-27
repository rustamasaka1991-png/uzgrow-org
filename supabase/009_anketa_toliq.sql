-- 10-migratsiya: anketa formasida 09 (rivojlanish) va 10 (takliflar) ham to'ldiriladi;
-- xodim o'z havolasi orqali rivojlanish rejasini ham o'zgartira oladi (baholash вЂ” faqat HR/rahbar)

create or replace function public.xodim_birlashtir(p_old jsonb, p_new jsonb) returns jsonb
language plpgsql immutable as $$
declare v jsonb; t jsonb; o jsonb; arr jsonb := '[]'::jsonb;
begin
  v := coalesce(p_old, '{}'::jsonb) || coalesce((
    select jsonb_object_agg(key, value) from jsonb_each(coalesce(p_new, '{}'::jsonb))
    where key in ('ism', 'foto', 'shaxsiy', 'talim', 'mehnat', 'oila', 'shaxsiyat', 'hobbi', 'maqsad', 'rivojlanish')
  ), '{}'::jsonb);
  if p_new ? 'takliflar' and jsonb_typeof(p_new -> 'takliflar') = 'array' then
    for t in select * from jsonb_array_elements(p_new -> 'takliflar') loop
      select e into o from jsonb_array_elements(coalesce(p_old -> 'takliflar', '[]'::jsonb)) e where e ->> 'id' = t ->> 'id' limit 1;
      if o is not null then
        arr := arr || jsonb_build_array(t || jsonb_build_object('holat', coalesce(o ->> 'holat', 'Yangi')));
      else
        arr := arr || jsonb_build_array(t || jsonb_build_object('holat', 'Yangi'));
      end if;
    end loop;
    v := v || jsonb_build_object('takliflar', arr);
  end if;
  return v;
end $$;

create or replace function public.anketa_yuborish(p_data jsonb) returns json
language plpgsql security definer set search_path = public as $$
declare v_ip text; v_cnt int; v_id uuid; v_clean jsonb;
begin
  if pg_column_size(p_data) > 1500000 then return json_build_object('ok', false, 'xato', 'Ma''lumot juda katta (rasm hajmini kamaytiring)'); end if;
  if coalesce(trim(p_data ->> 'ism'), '') = '' then return json_build_object('ok', false, 'xato', 'Ism-sharif kiritilmagan'); end if;
  if coalesce(p_data ->> 'website', '') <> '' then return json_build_object('ok', true, 'id', gen_random_uuid()); end if;

  v_ip := split_part(coalesce(current_setting('request.headers', true)::json ->> 'x-forwarded-for', 'nomalum'), ',', 1);
  insert into public.ariza_limit (ip, soni, boshi) values (v_ip, 1, now())
    on conflict (ip) do update set
      soni = case when public.ariza_limit.boshi < now() - interval '1 hour' then 1 else public.ariza_limit.soni + 1 end,
      boshi = case when public.ariza_limit.boshi < now() - interval '1 hour' then now() else public.ariza_limit.boshi end
    returning soni into v_cnt;
  if v_cnt > 5 then return json_build_object('ok', false, 'xato', 'Juda ko''p urinish. Birozdan keyin qayta urinib ko''ring.'); end if;

  -- takliflar holati har doim "Yangi"
  v_clean := public.xodim_birlashtir('{}'::jsonb, p_data);
  insert into public.arizalar (data, ip) values (v_clean, v_ip) returning id into v_id;
  return json_build_object('ok', true, 'id', v_id);
end $$;

select 'ok' as natija;
