-- Run in SQL Editor. Everything is rolled back, including test users and orders.
begin;
do $$
declare customer jsonb := '{"name":"Integration test","email":"integration@example.com","phone":"0500000000","address":"Test only","emirate":"Dubai"}';
  lines jsonb := '[{"productId":0,"size":"M","color":"Black","qty":2}]';
  request uuid := gen_random_uuid(); first_order text; second_order text; original integer; actual integer; test_user uuid := gen_random_uuid(); rejected boolean;
begin
  select stock into original from public.products where id=0;
  first_order := public.place_order(customer,lines,'std','cod',request);
  second_order := public.place_order(customer,lines,'std','cod',request);
  if first_order <> second_order then raise exception 'Idempotency failed'; end if;
  select stock into actual from public.products where id=0;
  if actual <> original-2 then raise exception 'Stock deducted twice or incorrectly'; end if;
  rejected := false;
  begin perform public.place_order(customer,lines,'exp','cod',request); exception when sqlstate '22023' then rejected := true; end;
  if not rejected then raise exception 'Reused request accepted different payload'; end if;
  rejected := false;
  begin perform public.place_order(customer,'[{"productId":0,"size":"S","color":"Pink","qty":1}]','std','cod',gen_random_uuid()); exception when sqlstate 'P0001' then rejected := true; end;
  if not rejected then raise exception 'Unavailable variant accepted'; end if;
  rejected := false;
  begin perform public.place_order(customer,'[{"productId":0,"size":"M","color":"Black","qty":20},{"productId":0,"size":"M","color":"Black","qty":20}]','std','cod',gen_random_uuid()); exception when sqlstate 'P0001' then rejected := true; end;
  if not rejected then raise exception 'Duplicate lines oversold stock'; end if;
  rejected := false;
  begin perform public.place_order(customer,'[{"productId":0,"color":"Black","qty":1}]','std','cod',gen_random_uuid()); exception when sqlstate '22023' then rejected := true; end;
  if not rejected then raise exception 'Missing size accepted'; end if;
  rejected := false;
  begin perform public.admin_set_order_status(first_order,'Cancelled'); exception when insufficient_privilege then rejected := true; end;
  if not rejected then raise exception 'Guest changed order'; end if;
  insert into auth.users(id,email) values(test_user,'rollback-admin@example.com');
  update public.profiles set role='admin' where id=test_user;
  perform set_config('request.jwt.claim.sub',test_user::text,true);
  perform public.admin_set_order_status(first_order,'Cancelled');
  perform public.admin_set_order_status(first_order,'Cancelled');
  select stock into actual from public.products where id=0;
  if actual <> original then raise exception 'Cancellation did not restore exactly once'; end if;
  if (select (variant_stock->>'Black|M')::integer from public.products where id=0) <> original then raise exception 'Variant stock mismatch'; end if;
end $$;
rollback;
