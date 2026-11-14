-- 17: bir vaqtda tahrirlashda o'zgarishlar yo'qolmasin; ochiq ro'yxat yengil; zaxiradan tiklanganda rasm qaytsin.
-- Hech qanday ma'lumot o'chirilmaydi. Eski funksiyalar (tuzilma_ochiq, ...) eski ilova nusxalari uchun saqlanadi.

-- 1) HR/rahbar saqlashi: 3 tomonlama birlashtirish.
--    p_asos — mijoz tahrirlashni boshlagandagi nusxa. Mijoz faqat o'zi o'zgartirgan maydonlarni yozadi;
--    boshqa odam shu orada o'zgartirgan maydonlar saqlanib qoladi (bo'limlar ichida savol darajasigacha).
create or replace function public.xodim_birlashtirib_saqla(p_id text, p_data jsonb, p_asos jsonb, p_tartib int)
returns jsonb language plpgsql security definer set search_path = public as $$
declare cur jsonb; res jsonb; k text; sk text; nv jsonb; bv jsonb; cv jsonb; sub jsonb;
begin
  if not public.is_admin() then raise exception 'ruxsat yo''q'; end if;
  select data into cur from public.xodimlar where id = p_id for update;
  if not found then
    insert into public.xodimlar (id, data, tartib, updated_at) values (p_id, p_data, p_tartib, now());
    return (select data - 'foto' from public.xodimlar where id = p_id);
  end if;
  res := cur;
  for k in select jsonb_object_keys(p_data) union select jsonb_object_keys(coalesce(p_asos, '{}'::jsonb)) loop
    nv := p_data -> k; bv := p_asos -> k; cv := cur -> k;
    continue when nv is not distinct from bv;               -- mijoz bu maydonni o'zgartirmagan
    if nv is null then res := res - k; continue; end if;     -- mijoz maydonni olib tashlagan (masalan arxivdan qaytarish)
    if jsonb_typeof(nv) = 'object' and jsonb_typeof(bv) = 'object' and jsonb_typeof(cv) = 'object' then
      sub := cv;
      for sk in select jsonb_object_keys(nv) union select jsonb_object_keys(bv) loop
        continue when (nv -> sk) is not distinct from (bv -> sk);
        if nv -> sk is null then sub := sub - sk; else sub := sub || jsonb_build_object(sk, nv -> sk); end if;
      end loop;
      res := res || jsonb_build_object(k, sub);
    else
      res := res || jsonb_build_object(k, nv);
    end if;
  end loop;
  update public.xodimlar set data = res, tartib = p_tartib, updated_at = now() where id = p_id;
  return (select data - 'foto' from public.xodimlar where id = p_id);
end $$;
revoke all on function public.xodim_birlashtirib_saqla(text, jsonb, jsonb, int) from public;
grant execute on function public.xodim_birlashtirib_saqla(text, jsonb, jsonb, int) to authenticated;

-- 2) Ochiq ro'yxat: faqat ro'yxat va qidiruv uchun kerakli maydonlar (to'liq anketa profil ochilganda)
create or replace function public.tuzilma_royxat() returns json
language sql stable security definer set search_path = public as $$
  select json_build_object(
    'bolimlar', (
      select coalesce(json_agg(json_build_object(
        'id', id, 'nomi', data ->> 'nomi', 'rang', data ->> 'rang', 'vazifalar', coalesce(data -> 'vazifalar', '[]'::jsonb)
      ) order by tartib, id), '[]'::json) from public.bolimlar),
    'xodimlar', (
      select coalesce(json_agg(jsonb_strip_nulls(jsonb_build_object(
        'id', id, 'ism', data -> 'ism', 'lavozim', data -> 'lavozim', 'bolim', data -> 'bolim', 'rahbar', data -> 'rahbar',
        'guruh', data -> 'guruh', 'foto_kichik', data -> 'foto_kichik', 'rahbar_belgisi', data -> 'rahbar_belgisi',
        'sinov_boshlandi', data -> 'sinov_boshlandi',
        'shaxsiy', jsonb_strip_nulls(jsonb_build_object('fish', data -> 'shaxsiy' -> 'fish', 'telefon', data -> 'shaxsiy' -> 'telefon', 'lavozim', data -> 'shaxsiy' -> 'lavozim'))
      )) order by tartib, id), '[]'::json)
      from public.xodimlar where not (data ? 'arxiv')),
    'ceoId', (select value from public.sozlamalar where key = 'ceoId')
  )
$$;
create or replace function public.tuzilma_royxat_belgi() returns text
language sql stable security definer set search_path = public as $$
  select md5(public.tuzilma_royxat()::text)
$$;
-- Bitta xodimning to'liq anketasi (ochiq rejimdagi profil uchun; katta rasm va pasportsiz)
create or replace function public.xodim_ochiq(p_id text) returns json
language sql stable security definer set search_path = public as $$
  select ((data - 'foto') || jsonb_build_object('id', id))::json from public.xodimlar where id = p_id and not (data ? 'arxiv')
$$;
revoke all on function public.tuzilma_royxat() from public;
revoke all on function public.tuzilma_royxat_belgi() from public;
revoke all on function public.xodim_ochiq(text) from public;
grant execute on function public.tuzilma_royxat() to anon, authenticated;
grant execute on function public.tuzilma_royxat_belgi() to anon, authenticated;
grant execute on function public.xodim_ochiq(text) to anon, authenticated;

-- 3) Zaxiradan tiklanganda (o'chirilgan xodim qayta qo'shilsa) katta rasm foto_arxiv'dan qaytadi.
--    Faqat shu id hozir bazada yo'q bo'lsa va kichik nusxa aynan mos kelsa (boshqa odamga tushib qolmasin).
create or replace function public.foto_saqla() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_bor boolean; v_f text;
begin
  if tg_op = 'INSERT' then
    if not (new.data ? 'foto') and coalesce(new.data ->> 'foto_kichik', '') <> '' then
      execute format('select exists (select 1 from public.%I where id = $1)', tg_table_name) into v_bor using new.id;
      if not v_bor then
        select foto into v_f from public.foto_arxiv
          where jadval = tg_table_name and qator_id = new.id::text and foto_kichik = new.data ->> 'foto_kichik'
          order by id desc limit 1;
        if v_f is not null then new.data := new.data || jsonb_build_object('foto', v_f); end if;
      end if;
    end if;
    return new;
  end if;
  if tg_op = 'DELETE' then
    if coalesce(old.data ->> 'foto', '') <> '' then
      insert into public.foto_arxiv (jadval, qator_id, foto, foto_kichik) values (tg_table_name, old.id::text, old.data ->> 'foto', old.data ->> 'foto_kichik');
    end if;
    return old;
  end if;
  -- yangi data'da rasm bo'lmasa, eskisi qoladi
  if not (new.data ? 'foto') and (old.data ? 'foto') then new.data := new.data || jsonb_build_object('foto', old.data -> 'foto'); end if;
  if not (new.data ? 'foto_kichik') and (old.data ? 'foto_kichik') then new.data := new.data || jsonb_build_object('foto_kichik', old.data -> 'foto_kichik'); end if;
  -- rasm almashtirilsa, eskisi arxivga
  if coalesce(old.data ->> 'foto', '') <> '' and (new.data ->> 'foto') is distinct from (old.data ->> 'foto') then
    insert into public.foto_arxiv (jadval, qator_id, foto, foto_kichik) values (tg_table_name, old.id::text, old.data ->> 'foto', old.data ->> 'foto_kichik');
  end if;
  return new;
end $$;
create or replace trigger foto_saqla before insert or update or delete on public.xodimlar for each row execute function public.foto_saqla();
create or replace trigger foto_saqla before insert or update or delete on public.arizalar for each row execute function public.foto_saqla();

select public.tuzilma_royxat_belgi() = public.tuzilma_royxat_belgi() as belgi_barqaror,
       length(public.tuzilma_royxat()::text) / 1024 as royxat_kb,
       length(public.tuzilma_ochiq()::text) / 1024 as eski_kb;
