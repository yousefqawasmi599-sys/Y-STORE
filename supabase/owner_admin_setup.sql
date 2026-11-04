-- Optional: replace OWNER_EMAIL@example.com with the chosen owner email before running.
create or replace function private.assign_store_owner() returns trigger language plpgsql security definer set search_path='' as $$
begin
  if lower(new.email) = 'OWNER_EMAIL@example.com' and new.email_confirmed_at is not null then
    insert into public.profiles(id,full_name,role) values(new.id,coalesce(new.raw_user_meta_data->>'full_name',''),'admin')
    on conflict(id) do update set role='admin';
  end if;
  return new;
end $$;
revoke all on function private.assign_store_owner() from public,anon,authenticated;
create trigger owner_admin_after_verification after insert or update of email_confirmed_at on auth.users
for each row execute function private.assign_store_owner();
update public.profiles p set role='admin' from auth.users u where u.id=p.id and lower(u.email)='OWNER_EMAIL@example.com' and u.email_confirmed_at is not null;
