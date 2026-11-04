-- Run in SQL Editor after customer_orders.sql. Everything is rolled back, including test users and orders.
begin;
do $$
declare customer jsonb := '{"name":"Tracking test","email":"Track@Example.com","phone":"0500000000","address":"Test only","emirate":"Dubai"}';
  lines jsonb := '[{"productId":0,"size":"M","color":"Black","qty":1}]';
  owner_id uuid := gen_random_uuid(); stranger_id uuid := gen_random_uuid();
  guest_order text; owner_order text; original integer; result jsonb; rejected boolean;
begin
  select (variant_stock->>'Black|M')::integer into original from public.products where id=0;
  guest_order := public.place_order(customer,lines,'std','cod',gen_random_uuid());

  result := public.track_order(guest_order,'track@example.com');
  if result->>'orderNumber' <> guest_order or result->>'status' <> 'New' then raise exception 'Tracking by number and email failed'; end if;
  if result->'customer' ? 'phone' or result->'customer' ? 'address' then raise exception 'Tracking exposed private details'; end if;
  if public.track_order(guest_order,'other@example.com') is not null then raise exception 'Wrong email revealed an order'; end if;
  rejected := false;
  begin perform public.track_order('nonsense','track@example.com'); exception when sqlstate '22023' then rejected := true; end;
  if not rejected then raise exception 'Malformed order number accepted'; end if;

  insert into auth.users(id,email) values(owner_id,'rollback-owner@example.com'),(stranger_id,'rollback-stranger@example.com');
  perform set_config('request.jwt.claim.sub',owner_id::text,true);
  owner_order := public.place_order(customer,lines,'std','cod',gen_random_uuid());

  perform set_config('request.jwt.claim.sub',stranger_id::text,true);
  rejected := false;
  begin perform public.cancel_my_order(owner_order); exception when sqlstate 'P0002' then rejected := true; end;
  if not rejected then raise exception 'Another customer cancelled the order'; end if;
  rejected := false;
  begin perform public.cancel_my_order(guest_order); exception when sqlstate 'P0002' then rejected := true; end;
  if not rejected then raise exception 'Customer cancelled a guest order'; end if;

  perform set_config('request.jwt.claim.sub',owner_id::text,true);
  perform public.cancel_my_order(owner_order);
  if (select status from public.orders where order_number=owner_order) <> 'Cancelled' then raise exception 'Cancellation not saved'; end if;
  if (select (variant_stock->>'Black|M')::integer from public.products where id=0) <> original-1 then raise exception 'Cancellation did not restore stock exactly once'; end if;
  rejected := false;
  begin perform public.cancel_my_order(owner_order); exception when sqlstate '22023' then rejected := true; end;
  if not rejected then raise exception 'Cancelled order cancelled again'; end if;
end $$;
rollback;
