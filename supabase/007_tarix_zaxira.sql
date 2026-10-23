-- 8-migratsiya: o'zgarishlar tarixi, kunlik zaxira, arxiv, IP tozalash

-- 1) O'zgarishlar tarixi
create table if not exists public.tarix (
  id bigserial primary key,
  vaqt timestamptz not null default now(),
  kim text not null,
  jadval text not null,
  amal text not null,
  yozuv_id text,
  eski jsonb,
  yangi jsonb
);
alter table public.tarix enable row level security;
drop policy if exists admin_read on public.tarix;
create policy admin_read on public.tarix for select to authenticated using (public.is_admin());
create index if not exists tarix_vaqt_idx on public.tarix (vaqt desc);

create or replace function public.tarix_yoz() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_kim text; v_eski jsonb; v_yangi jsonb; v_id text;
begin
  v_kim := coalesce(nullif(auth.jwt() ->> 'email', ''), 'xodim (havola) / anonim');
  if tg_op <> 'INSERT' then v_eski := to_jsonb(old); end if;
  if tg_op <> 'DELETE' then v_yangi := to_jsonb(new); end if;
  -- rasmlar va tokenlar tarixda saqlanmaydi
  if v_eski ? 'data' then v_eski := jsonb_set(v_eski, '{data}', (v_eski -> 'data') - 'foto'); end if;
  if v_yangi ? 'data' then v_yangi := jsonb_set(v_yangi, '{data}', (v_yangi -> 'data') - 'foto'); end if;
  v_eski := v_eski - 'token' - 'ip'; v_yangi := v_yangi - 'token' - 'ip';
  v_id := coalesce(v_yangi ->> 'id', v_eski ->> 'id', v_yangi ->> 'key', v_eski ->> 'key');
  -- faqat token yangilangan bo'lsa (shaxsiy havola) ham yozamiz, lekin ma'lumot o'zgarmagan bo'lsa o'tkazib yuboramiz
  if tg_op = 'UPDATE' and v_eski = v_yangi then return new; end if;
  insert into public.tarix (kim, jadval, amal, yozuv_id, eski, yangi) values (v_kim, tg_table_name, tg_op, v_id, v_eski, v_yangi);
  return coalesce(new, old);
end $$;

drop trigger if exists tarix_xodimlar on public.xodimlar;
drop trigger if exists tarix_bolimlar on public.bolimlar;
drop trigger if exists tarix_arizalar on public.arizalar;
drop trigger if exists tarix_sozlamalar on public.sozlamalar;
create trigger tarix_xodimlar after insert or update or delete on public.xodimlar for each row execute function public.tarix_yoz();
create trigger tarix_bolimlar after insert or update or delete on public.bolimlar for each row execute function public.tarix_yoz();
create trigger tarix_arizalar after insert or update or delete on public.arizalar for each row execute function public.tarix_yoz();
create trigger tarix_sozlamalar after insert or update or delete on public.sozlamalar for each row execute function public.tarix_yoz();

-- 2) Kunlik zaxira (bazada, 30 kun)
create table if not exists public.zaxiralar (
  id bigserial primary key,
  vaqt timestamptz not null default now(),
  manba text not null default 'cron',
  data jsonb not null
);
alter table public.zaxiralar enable row level security;
drop policy if exists admin_read on public.zaxiralar;
create policy admin_read on public.zaxiralar for select to authenticated using (public.is_admin());

create or replace function public.zaxira_yarat(p_manba text) returns bigint
language plpgsql security definer set search_path = public as $$
declare v_id bigint;
begin
  insert into public.zaxiralar (manba, data) select p_manba, jsonb_build_object(
    'version', 1,
    'bolimlar', coalesce((select jsonb_agg(data order by tartib) from public.bolimlar), '[]'::jsonb),
    'xodimlar', coalesce((select jsonb_agg(data order by tartib) from public.xodimlar), '[]'::jsonb),
    'ceoId', (select value from public.sozlamalar where key = 'ceoId'),
    'updatedAt', now())
  returning id into v_id;
  delete from public.zaxiralar where vaqt < now() - interval '30 days';
  delete from public.tarix where vaqt < now() - interval '180 days';
  update public.arizalar set ip = null where ip is not null and created_at < now() - interval '30 days';
  return v_id;
end $$;
revoke all on function public.zaxira_yarat(text) from public;

-- Admin qo'lda zaxira oladi
create or replace function public.zaxira_ol() returns bigint
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'ruxsat yo''q'; end if;
  return public.zaxira_yarat('qolda');
end $$;
revoke all on function public.zaxira_ol() from public;
grant execute on function public.zaxira_ol() to authenticated;

-- Har kuni 01:00 (UTC) avtomatik
create extension if not exists pg_cron;
do $$ begin
  perform cron.unschedule(jobid) from cron.job where jobname = 'uzgrow-zaxira';
exception when others then null; end $$;
select cron.schedule('uzgrow-zaxira', '0 1 * * *', $$select public.zaxira_yarat('cron')$$);

-- 3) Arxivdagi xodimlar ochiq tuzilmada ko'rinmaydi
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
        'lavozim', data ->> 'lavozim', 'guruh', data ->> 'guruh', 'foto', data ->> 'foto',
        'rahbar_belgisi', coalesce((data ->> 'rahbar_belgisi')::boolean, false)
      ) order by tartib), '[]'::json) from public.xodimlar where not (data ? 'arxiv')),
    'ceoId', (select value from public.sozlamalar where key = 'ceoId')
  )
$$;

-- Birinchi zaxira hozir
select public.zaxira_yarat('migratsiya') as zaxira_id, (select count(*) from cron.job where jobname = 'uzgrow-zaxira') as cron_bor;
