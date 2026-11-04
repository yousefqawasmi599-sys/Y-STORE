-- Guest order tracking and customer self-cancellation. Run once after order_submission_limit.sql.
begin;

-- Guests look up one order by its number and checkout email. Returns null when nothing matches,
-- so a wrong guess reveals nothing. Lookups share the database submission limits.
create or replace function public.track_order(p_order_number text, p_email text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare found_order public.orders%rowtype;
begin
  if coalesce(p_order_number, '') !~ '^Y-[0-9A-F]{8}$'
    or length(coalesce(p_email, '')) not between 3 and 254 then
    raise exception 'Invalid lookup' using errcode = '22023';
  end if;
  perform private.check_submission_limit('track_order', p_email);
  select * into found_order from public.orders
    where order_number = p_order_number and lower(customer->>'email') = lower(trim(p_email));
  if not found then return null; end if;
  return jsonb_build_object(
    'orderNumber', found_order.order_number,
    'status', found_order.status,
    'createdAt', found_order.created_at,
    'shipping', found_order.shipping,
    'subtotal', found_order.subtotal,
    'delivery', found_order.delivery,
    'total', found_order.total,
    'customer', jsonb_build_object('name', found_order.customer->>'name', 'emirate', found_order.customer->>'emirate'),
    'lines', coalesce((select jsonb_agg(jsonb_build_object(
        'name', item.product_name, 'size', item.size, 'color', item.color, 'q', item.qty, 'price', item.unit_price) order by item.id)
      from public.order_items item where item.order_id = found_order.id), '[]'::jsonb)
  );
end $$;
revoke all on function public.track_order(text, text) from public;
grant execute on function public.track_order(text, text) to anon, authenticated;

-- Signed-in customers can cancel their own order while it is still New. Stock is restored once.
create or replace function public.cancel_my_order(p_order_number text)
returns void language plpgsql security definer set search_path = '' as $$
declare current_order public.orders%rowtype; item record;
begin
  if auth.uid() is null then raise exception 'Sign in required' using errcode = '42501'; end if;
  select * into current_order from public.orders
    where order_number = p_order_number and user_id = auth.uid() for update;
  if not found then raise exception 'Order not found' using errcode = 'P0002'; end if;
  if current_order.status <> 'New' then
    raise exception 'Only new orders can be cancelled' using errcode = '22023';
  end if;
  perform id from public.products
    where id in (select product_id from public.order_items where order_id = current_order.id) order by id for update;
  for item in select product_id, color || '|' || size variant, sum(qty)::integer qty
    from public.order_items where order_id = current_order.id and product_id is not null group by 1, 2 loop
    update public.products set variant_stock = jsonb_set(variant_stock, array[item.variant],
      to_jsonb(coalesce((variant_stock->>item.variant)::integer, 0) + item.qty)), updated_at = now()
      where id = item.product_id;
  end loop;
  update public.orders set status = 'Cancelled' where id = current_order.id;
end $$;
revoke all on function public.cancel_my_order(text) from public, anon;
grant execute on function public.cancel_my_order(text) to authenticated;

commit;
