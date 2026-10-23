-- 7-migratsiya: ro'yxatdan o'tishni yopish вЂ” faqat adminlar jadvalidagi emaillar auth.users ga kira oladi
create or replace function public.signup_tekshir() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.adminlar where email = lower(coalesce(new.email, ''))) then
    raise exception 'Ro''yxatdan o''tish yopiq: % admin ro''yxatida yo''q', coalesce(new.email, '?') using errcode = 'P0001';
  end if;
  return new;
end $$;
revoke all on function public.signup_tekshir() from public;

drop trigger if exists signup_tekshir on auth.users;
create trigger signup_tekshir before insert on auth.users for each row execute function public.signup_tekshir();

select tgname, tgenabled from pg_trigger where tgname = 'signup_tekshir';
