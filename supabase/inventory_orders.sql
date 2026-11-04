begin;
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
alter table public.products add column if not exists variant_stock jsonb not null default '{}'::jsonb;
-- Existing quantities are demo data. Preserve totals, assigning them to Black/M (accessories: ONE SIZE).
update public.products set variant_stock = jsonb_build_object('Black|' || case when cat in ('caps','headbands') then 'ONE SIZE' else 'M' end, stock);
create or replace function private.validate_inventory() returns trigger language plpgsql set search_path = '' as $$
declare entry record; total integer := 0;
begin
  if jsonb_typeof(new.variant_stock) <> 'object' then raise exception 'Invalid inventory' using errcode='22023'; end if;
  for entry in select * from jsonb_each(new.variant_stock) loop
    if entry.key !~ '^[^|]{1,40}\|(S|M|L|XL|XXL|ONE SIZE)$'
       or jsonb_typeof(entry.value) <> 'number' or entry.value::text !~ '^[0-9]{1,6}$'
       or not exists (select 1 from jsonb_array_elements(new.colors) c where c->>0=split_part(entry.key,'|',1))
       or ((new.cat in ('caps','headbands')) <> (split_part(entry.key,'|',2)='ONE SIZE')) then
      raise exception 'Invalid inventory variant' using errcode='22023';
    end if;
    total := total + (entry.value::text)::integer;
  end loop;
  if total > 1000000 then raise exception 'Inventory too large' using errcode='22023'; end if;
  new.stock := total;
  return new;
end $$;
create trigger validate_inventory before insert or update on public.products for each row execute function private.validate_inventory();
alter function public.place_order(jsonb,jsonb,text,text) set schema private;
alter function public.admin_set_order_status(text,text) set schema private;
revoke all on function private.place_order(jsonb,jsonb,text,text) from public,anon,authenticated;
revoke all on function private.admin_set_order_status(text,text) from public,anon,authenticated;
create table private.order_requests (request_id uuid primary key, payload jsonb not null, order_number text not null, created_at timestamptz not null default now());
alter table private.order_requests enable row level security;
create or replace function public.place_order(p_customer jsonb,p_lines jsonb,p_shipping text,p_payment text,p_request_id uuid)
returns text language plpgsql security definer set search_path = '' as $$
declare saved record; item record; product public.products%rowtype; result text; payload jsonb;
begin
  if p_request_id is null then raise exception 'Request ID required' using errcode='22023'; end if;
  payload := jsonb_build_object('customer',p_customer,'lines',p_lines,'shipping',p_shipping,'payment',p_payment,'user',auth.uid());
  perform pg_advisory_xact_lock(hashtextextended(p_request_id::text,0));
  select * into saved from private.order_requests where request_id=p_request_id;
  if found then
    if saved.payload <> payload then raise exception 'Request already used' using errcode='22023'; end if;
    return saved.order_number;
  end if;
  if jsonb_typeof(p_customer) is distinct from 'object' or jsonb_typeof(p_lines) is distinct from 'array'
    or jsonb_array_length(p_lines) not between 1 and 30
    or p_shipping is null or p_shipping not in ('std','exp') or p_payment is distinct from 'cod'
    or p_customer->>'email' is null or length(p_customer->>'email') > 254 or p_customer->>'email' !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
    or length(coalesce(p_customer->>'name','')) not between 1 and 100
    or length(coalesce(p_customer->>'phone','')) not between 1 and 40
    or length(coalesce(p_customer->>'address','')) not between 1 and 500
    or coalesce(p_customer->>'emirate','') not in ('Abu Dhabi','Dubai','Sharjah','Ajman','Umm Al Quwain','Ras Al Khaimah','Fujairah') then
    raise exception 'Invalid order' using errcode='22023';
  end if;
  for item in select value from jsonb_array_elements(p_lines) loop
    if jsonb_typeof(item.value) <> 'object' or coalesce(item.value->>'productId','') !~ '^[0-9]{1,15}$'
      or coalesce(item.value->>'qty','') !~ '^([1-9]|1[0-9]|20)$'
      or coalesce(item.value->>'size','') not in ('S','M','L','XL','XXL','ONE SIZE')
      or length(coalesce(item.value->>'color','')) not between 1 and 40 then
      raise exception 'Invalid order line' using errcode='22023';
    end if;
  end loop;
  -- Lock in stable order, then aggregate duplicates before checking availability.
  perform id from public.products where id in (select (value->>'productId')::bigint from jsonb_array_elements(p_lines)) order by id for update;
  for item in select (value->>'productId')::bigint id, (value->>'color') || '|' || (value->>'size') variant, sum((value->>'qty')::integer)::integer qty
    from jsonb_array_elements(p_lines) group by 1,2 loop
    select * into product from public.products where id=item.id and active;
    if not found or coalesce((product.variant_stock->>item.variant)::integer,0) < item.qty then
      raise exception 'Selected variant unavailable' using errcode='P0001';
    end if;
  end loop;
  result := private.place_order(p_customer,p_lines,p_shipping,p_payment);
  for item in select (value->>'productId')::bigint id, (value->>'color') || '|' || (value->>'size') variant, sum((value->>'qty')::integer)::integer qty
    from jsonb_array_elements(p_lines) group by 1,2 loop
    update public.products set variant_stock=jsonb_set(variant_stock,array[item.variant],to_jsonb((variant_stock->>item.variant)::integer-item.qty)) where id=item.id;
  end loop;
  insert into private.order_requests(request_id,payload,order_number) values(p_request_id,payload,result);
  return result;
end $$;
revoke all on function public.place_order(jsonb,jsonb,text,text,uuid) from public;
grant execute on function public.place_order(jsonb,jsonb,text,text,uuid) to anon,authenticated;
create or replace function public.admin_set_order_status(p_order_number text,p_status text)
returns void language plpgsql security definer set search_path='' as $$
declare current_order public.orders%rowtype; item record;
begin
  if auth.uid() is null or not public.is_admin() then raise exception 'Admin required' using errcode='42501'; end if;
  select * into current_order from public.orders where order_number=p_order_number for update;
  if not found then raise exception 'Order not found' using errcode='P0002'; end if;
  perform id from public.products where id in(select product_id from public.order_items where order_id=current_order.id) order by id for update;
  perform private.admin_set_order_status(p_order_number,p_status);
  if p_status='Cancelled' and current_order.status <> 'Cancelled' then
    for item in select product_id, color || '|' || size variant, sum(qty)::integer qty from public.order_items where order_id=current_order.id group by 1,2 loop
      update public.products set variant_stock=jsonb_set(variant_stock,array[item.variant],to_jsonb(coalesce((variant_stock->>item.variant)::integer,0)+item.qty)) where id=item.product_id;
    end loop;
  end if;
end $$;
revoke all on function public.admin_set_order_status(text,text) from public,anon;
grant execute on function public.admin_set_order_status(text,text) to authenticated;
create index if not exists orders_user_id_idx on public.orders(user_id);
create index if not exists order_items_order_id_idx on public.order_items(order_id);
commit;
