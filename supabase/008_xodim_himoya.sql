-- 9-migratsiya: xodim havolasi uchun qo'shimcha himoya

-- Xodim o'z anketasini saqlaganda: takliflar holatini o'zgartira olmaydi
-- (mavjud taklifda eski holat qoladi, yangi taklif "Yangi" bo'ladi)
create or replace function public.xodim_birlashtir(p_old jsonb, p_new jsonb) returns jsonb
language plpgsql immutable as $$
declare v jsonb; t jsonb; o jsonb; arr jsonb := '[]'::jsonb;
begin
  v := coalesce(p_old, '{}'::jsonb) || coalesce((
    select jsonb_object_agg(key, value) from jsonb_each(coalesce(p_new, '{}'::jsonb))
    where key in ('ism', 'foto', 'shaxsiy', 'talim', 'mehnat', 'oila', 'shaxsiyat', 'hobbi', 'maqsad')
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

-- Arxivdagi xodimning havolasi ishlamaydi
create or replace function public.xodim_olish(p_token text) returns json
language plpgsql stable security definer set search_path = public as $$
declare x public.xodimlar; b public.bolimlar; r public.xodimlar;
begin
  if coalesce(p_token, '') = '' then return json_build_object('ok', false, 'xato', 'Token yo''q'); end if;
  select * into x from public.xodimlar where token = p_token;
  if not found then return json_build_object('ok', false, 'xato', 'Havola topilmadi. HR dan yangi havola so''rang.'); end if;
  if x.data ? 'arxiv' then return json_build_object('ok', false, 'xato', 'Bu havola faol emas (xodim arxivda). HR ga murojaat qiling.'); end if;
  select * into b from public.bolimlar where id = x.data ->> 'bolim';
  select * into r from public.xodimlar where id = x.data ->> 'rahbar';
  return json_build_object('ok', true, 'xodim', x.data, 'bolim_nomi', b.data ->> 'nomi', 'bolim_rang', coalesce(b.data ->> 'rang', '#1d7a3e'), 'rahbar_ism', r.data ->> 'ism');
end $$;

create or replace function public.xodim_saqlash(p_token text, p_data jsonb) returns json
language plpgsql security definer set search_path = public as $$
declare v jsonb;
begin
  if pg_column_size(p_data) > 1500000 then return json_build_object('ok', false, 'xato', 'Ma''lumot juda katta (rasm hajmini kamaytiring)'); end if;
  update public.xodimlar set data = public.xodim_birlashtir(data, p_data), updated_at = now()
    where token = p_token and not (data ? 'arxiv') returning data into v;
  if not found then return json_build_object('ok', false, 'xato', 'Havola topilmadi yoki faol emas'); end if;
  return json_build_object('ok', true, 'xodim', v);
end $$;

-- Tekshiruv: takliflar holati saqlanadimi
select (public.xodim_birlashtir(
  '{"ism":"A","takliflar":[{"id":"t1","muammo":"x","holat":"Tasdiqlandi"}]}'::jsonb,
  '{"ism":"B","bolim":"hr","takliflar":[{"id":"t1","muammo":"y","holat":"Natija o''lchandi"},{"id":"t2","muammo":"z","holat":"Tasdiqlandi"}]}'::jsonb
)) as natija;
