begin;
create table private.submission_limits (bucket text primary key, count integer not null, expires_at timestamptz not null);
create index submission_limits_expiry_idx on private.submission_limits(expires_at);
alter table private.submission_limits enable row level security;
create or replace function private.check_submission_limit(scope text, email text) returns void language plpgsql set search_path='' as $$
declare n integer; current_bucket text; allowed integer;
begin
  delete from private.submission_limits where expires_at < now();
  -- Shared across all web servers, including direct Data API submissions.
  foreach current_bucket in array array[scope || ':global',scope || ':' || md5(lower(trim(email)))] loop
    allowed := case when current_bucket=scope || ':global' then 500 else 5 end;
    insert into private.submission_limits(bucket,count,expires_at) values(current_bucket,1,now()+interval '1 minute')
      on conflict(bucket) do update set count=private.submission_limits.count+1 returning count into n;
    if n > allowed then raise exception 'Too many submissions. Try again shortly.' using errcode='P0429'; end if;
  end loop;
end $$;
create or replace function private.limit_form_submission() returns trigger language plpgsql security definer set search_path='' as $$
begin
  if length(new.email) > 254 or new.email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then raise exception 'Invalid email' using errcode='22023'; end if;
  if tg_table_name='contact_messages' then
    if length(new.name) not between 1 and 100 or length(new.message) not between 5 and 3000 then raise exception 'Invalid message' using errcode='22023'; end if;
  end if;
  perform private.check_submission_limit(tg_table_name,new.email);
  return new;
end $$;
create trigger contact_submission_limit before insert on public.contact_messages for each row execute function private.limit_form_submission();
create trigger newsletter_submission_limit before insert on public.newsletter_subscribers for each row execute function private.limit_form_submission();
commit;
