-- 3-migratsiya: admin rollari (2026-10-22)
alter table public.adminlar add column if not exists rol text not null default 'hr';
alter table public.adminlar add column if not exists nomi text not null default '';
insert into public.adminlar(email, rol, nomi) values ('hr@uzgrow.uz', 'hr', 'HR bo''limi') on conflict (email) do update set rol = excluded.rol, nomi = excluded.nomi;
insert into public.adminlar(email, rol, nomi) values ('rahbar@uzgrow.uz', 'rahbar', 'Bosh direktor') on conflict (email) do update set rol = excluded.rol, nomi = excluded.nomi;
update public.adminlar set rol = 'rahbar', nomi = 'Ta''sischi' where email = 'rustamasaka1991@gmail.com';

create or replace function public.mening_rolim() returns json
language sql stable security definer set search_path = public as $$
  select coalesce((select json_build_object('rol', rol, 'nomi', nomi) from public.adminlar where email = lower(coalesce(auth.jwt() ->> 'email', ''))), json_build_object('rol', null))
$$;
revoke all on function public.mening_rolim() from public;
grant execute on function public.mening_rolim() to authenticated;

-- Hisoblarni tasdiqlash (email tasdiqlash yoqilgan, xat kutmaymiz)
update auth.users set email_confirmed_at = coalesce(email_confirmed_at, now()) where email in ('hr@uzgrow.uz', 'rahbar@uzgrow.uz');

select a.email, a.rol, a.nomi, (u.email_confirmed_at is not null) as tasdiqlangan from public.adminlar a left join auth.users u on u.email = a.email order by a.rol, a.email;
