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
  perform private.check_submission_limit('orders',p_customer->>'email');
  result := private.place_order(p_customer,p_lines,p_shipping,p_payment);
  for item in select (value->>'productId')::bigint id, (value->>'color') || '|' || (value->>'size') variant, sum((value->>'qty')::integer)::integer qty
    from jsonb_array_elements(p_lines) group by 1,2 loop
    update public.products set variant_stock=jsonb_set(variant_stock,array[item.variant],to_jsonb((variant_stock->>item.variant)::integer-item.qty)) where id=item.id;
  end loop;
  insert into private.order_requests(request_id,payload,order_number) values(p_request_id,payload,result);
  return result;
end $$;
