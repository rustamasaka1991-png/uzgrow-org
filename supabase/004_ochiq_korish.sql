-- 4-migratsiya: ochiq ko'rish funksiyasi (2026-10-22)
-- Ochiq (loginsiz) ko'rish: faqat tuzilma uchun kerakli, maxfiy bo'lmagan maydonlar.
-- Telefon, manzil, oila, baholash, tokenlar va boshqa anketa ma'lumotlari QAYTARILMAYDI.
create or replace function public.tuzilma_ochiq() returns json
language sql stable security definer set search_path = public as $$
  select json_build_object(
    'bolimlar', (
      select coalesce(json_agg(json_build_object(
        'id', id, 'nomi', data ->> 'nomi', 'rang', data ->> 'rang', 'vazifalar', coalesce(data -> 'vazifalar', '[]'::jsonb)
      ) order by tartib), '[]'::json) from public.bolimlar),
    'xodimlar', (
      select coalesce(json_agg(json_build_object(
        'id', id, 'bolim', data ->> 'bolim', 'rahbar', data ->> 'rahbar', 'ism', data ->> 'ism',
        'lavozim', data ->> 'lavozim', 'guruh', data ->> 'guruh', 'foto', data ->> 'foto'
      ) order by tartib), '[]'::json) from public.xodimlar),
    'ceoId', (select value from public.sozlamalar where key = 'ceoId')
  )
$$;
revoke all on function public.tuzilma_ochiq() from public;
grant execute on function public.tuzilma_ochiq() to anon, authenticated;

select json_array_length((public.tuzilma_ochiq()) -> 'xodimlar') as xodimlar, json_array_length((public.tuzilma_ochiq()) -> 'bolimlar') as bolimlar;
