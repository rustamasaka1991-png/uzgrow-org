-- 16: trafikni tejash, anketa limiti, zaxiralar hajmi. Hech qanday ma'lumot o'chirilmaydi.

-- 1) Ochiq sahifa uchun kichik "belgi": tuzilma o'zgarmagan bo'lsa, brauzer to'liq ma'lumotni qayta yuklamaydi
create or replace function public.tuzilma_ochiq_belgi() returns text
language sql stable security definer set search_path = public as $$
  select md5(public.tuzilma_ochiq()::text)
$$;
revoke all on function public.tuzilma_ochiq_belgi() from public;
grant execute on function public.tuzilma_ochiq_belgi() to anon, authenticated;

-- 2) Anketa limiti: bitta IP (ofis Wi-Fi, mobil operator) dan soatiga 5 emas, 30 ta
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
  if v_cnt > 30 then return json_build_object('ok', false, 'xato', 'Juda ko''p urinish. Birozdan keyin qayta urinib ko''ring.'); end if;

  -- takliflar holati har doim "Yangi"
  v_clean := public.xodim_birlashtir('{}'::jsonb, p_data);
  insert into public.arizalar (data, ip) values (v_clean, v_ip) returning id into v_id;
  return json_build_object('ok', true, 'id', v_id);
end $$;

-- 3a) Rasm almashtirilsa yoki qator o'chirilsa, eski katta rasm shu yerda abadiy saqlanadi
create table if not exists public.foto_arxiv (
  id bigserial primary key,
  jadval text not null,
  qator_id text not null,
  foto text not null,
  foto_kichik text,
  vaqt timestamptz not null default now()
);
create index if not exists foto_arxiv_qator on public.foto_arxiv (qator_id, vaqt desc);
alter table public.foto_arxiv enable row level security;
drop policy if exists foto_arxiv_admin on public.foto_arxiv;
create policy foto_arxiv_admin on public.foto_arxiv for select to authenticated using (public.is_admin());

create or replace function public.foto_saqla() returns trigger
language plpgsql security definer set search_path = public as $$
begin
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
create or replace trigger foto_saqla before update or delete on public.xodimlar for each row execute function public.foto_saqla();
create or replace trigger foto_saqla before update or delete on public.arizalar for each row execute function public.foto_saqla();

-- 3b) Kunlik zaxira katta rasmsiz (kichik nusxa qoladi; katta rasmlar xodimlar jadvalida va foto_arxiv'da).
--     Zaxira ~4 marta kichik bo'lgani uchun saqlash muddati 30 kundan 90 kunga uzaytirildi.
create or replace function public.zaxira_yarat(p_manba text) returns bigint
language plpgsql security definer set search_path = public as $$
declare v_id bigint;
begin
  insert into public.zaxiralar (manba, data) select p_manba, jsonb_build_object(
    'version', 1,
    'bolimlar', coalesce((select jsonb_agg(data order by tartib) from public.bolimlar), '[]'::jsonb),
    'xodimlar', coalesce((select jsonb_agg(data - 'foto' order by tartib) from public.xodimlar), '[]'::jsonb),
    'ceoId', (select value from public.sozlamalar where key = 'ceoId'),
    'updatedAt', now())
  returning id into v_id;
  delete from public.zaxiralar where vaqt < now() - interval '90 days';
  delete from public.tarix where vaqt < now() - interval '180 days';
  update public.arizalar set ip = null where ip is not null and created_at < now() - interval '30 days';
  return v_id;
end $$;

select (select count(*) from pg_trigger where tgname = 'foto_saqla') as triggerlar,
       public.tuzilma_ochiq_belgi() = public.tuzilma_ochiq_belgi() as belgi_barqaror;
