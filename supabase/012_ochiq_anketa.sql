-- 13-migratsiya: ochiq rejimda anketa to'liq ko'rinadi (ta'sischi qarori, 2026-11-02).
-- Pasport rasmlari ochiq rejimga chiqmaydi; qo'shimcha rasmlar chiqadi.

create or replace function public.tuzilma_ochiq() returns json
language sql stable security definer set search_path = public as $$
  select json_build_object(
    'bolimlar', (
      select coalesce(json_agg(json_build_object(
        'id', id, 'nomi', data ->> 'nomi', 'rang', data ->> 'rang', 'vazifalar', coalesce(data -> 'vazifalar', '[]'::jsonb)
      ) order by tartib), '[]'::json) from public.bolimlar),
    'xodimlar', (
      select coalesce(json_agg((data || jsonb_build_object('id', id)) order by tartib), '[]'::json)
      from public.xodimlar where not (data ? 'arxiv')),
    'ceoId', (select value from public.sozlamalar where key = 'ceoId')
  )
$$;

-- Xodimning qo'shimcha rasmlari (pasportsiz) вЂ” ochiq
create or replace function public.xodim_rasmlar_ochiq(p_id text) returns json
language sql stable security definer set search_path = public as $$
  select coalesce(json_agg(json_build_object('id', f.id, 'turi', f.turi, 'idx', f.idx, 'data', f.data) order by f.idx), '[]'::json)
  from public.xodim_fayllar f join public.xodimlar x on x.id = f.xodim_id
  where f.xodim_id = p_id and f.turi = 'rasm' and not (x.data ? 'arxiv')
$$;
revoke all on function public.xodim_rasmlar_ochiq(text) from public;
grant execute on function public.xodim_rasmlar_ochiq(text) to anon, authenticated;

select json_array_length((public.tuzilma_ochiq()) -> 'xodimlar') as xodimlar;
