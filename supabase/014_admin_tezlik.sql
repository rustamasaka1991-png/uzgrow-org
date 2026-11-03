-- 15-migratsiya: HR yuklashi katta rasmsiz; yangilashda bazadagi rasm o'chib ketmasin

-- Admin uchun tuzilma (foto'siz, token bilan)
create or replace function public.tuzilma_admin() returns json
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'ruxsat yo''q'; end if;
  return json_build_object(
    'bolimlar', (select coalesce(json_agg(json_build_object('id', id, 'data', data, 'tartib', tartib) order by tartib), '[]'::json) from public.bolimlar),
    'xodimlar', (select coalesce(json_agg(json_build_object('id', id, 'data', data - 'foto', 'tartib', tartib, 'token', token) order by tartib), '[]'::json) from public.xodimlar),
    'sozlamalar', (select coalesce(json_agg(json_build_object('key', key, 'value', value)), '[]'::json) from public.sozlamalar)
  );
end $$;
revoke all on function public.tuzilma_admin() from public;
grant execute on function public.tuzilma_admin() to authenticated;

-- Himoya: yangi data'da foto / foto_kichik bo'lmasa, eskisi saqlanib qoladi (hech narsa o'chmaydi)
create or replace function public.foto_saqla() returns trigger
language plpgsql as $$
begin
  if tg_op = 'UPDATE' then
    if not (new.data ? 'foto') and (old.data ? 'foto') then new.data := new.data || jsonb_build_object('foto', old.data -> 'foto'); end if;
    if not (new.data ? 'foto_kichik') and (old.data ? 'foto_kichik') then new.data := new.data || jsonb_build_object('foto_kichik', old.data -> 'foto_kichik'); end if;
  end if;
  return new;
end $$;
drop trigger if exists foto_saqla on public.xodimlar;
create trigger foto_saqla before update on public.xodimlar for each row execute function public.foto_saqla();
drop trigger if exists foto_saqla on public.arizalar;
create trigger foto_saqla before update on public.arizalar for each row execute function public.foto_saqla();

select count(*) as triggerlar from pg_trigger where tgname = 'foto_saqla';
