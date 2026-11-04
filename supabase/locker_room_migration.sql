begin;

insert into public.categories (slug, label, img) values
  ('caps', 'Caps', '/images/products/enhanced/caps/caps_black.png'),
  ('headbands', 'Headbands', '/images/products/enhanced/headbands/headbands_black.png')
on conflict (slug) do nothing;

update public.products
set img = case name
  when 'Essential Hoodie' then '/images/products/enhanced/hoodies/hoodies_black.png'
  when 'Classic Hoodie' then '/images/products/enhanced/hoodies/hoodies_black.png'
  when 'Signature Hoodie' then '/images/products/enhanced/hoodies/hoodies_black.png'
  when 'Core Tee' then '/images/products/enhanced/tshirts/tshirts_black.png'
  when 'Long Sleeve Tee' then '/images/products/enhanced/long_sleeve/long_sleeve_black.png'
  when 'Oversized Tee' then '/images/products/enhanced/tshirts/tshirts_black.png'
  when 'Zip Hoodie' then '/images/products/enhanced/hoodies/hoodies_black.png'
  when 'Heavy Long Sleeve' then '/images/products/enhanced/long_sleeve/long_sleeve_black.png'
  else img
end
where name in (
  'Essential Hoodie', 'Classic Hoodie', 'Signature Hoodie', 'Core Tee',
  'Long Sleeve Tee', 'Oversized Tee', 'Zip Hoodie', 'Heavy Long Sleeve'
);

update public.products p
set colors = p.colors || coalesce((
  select jsonb_agg(option.value)
  from jsonb_array_elements(
    '[["Cream","#eadfca"],["Beige","#d6bf9c"],["Dark Grey","#3b3b3e"],["Olive Green","#4b5330"],["Brown","#4a2e20"],["Navy","#14213d"],["Pink","#e8b4bd"],["Light Blue","#9dbfe6"]]'::jsonb
  ) as option(value)
  where not exists (
    select 1
    from jsonb_array_elements(p.colors) as existing(value)
    where existing.value ->> 0 = option.value ->> 0
  )
), '[]'::jsonb)
where (p.id = 0 and p.name = 'Essential Hoodie' and p.cat = 'hoodies')
  or (p.id = 3 and p.name = 'Core Tee' and p.cat = 'tees')
  or (p.id = 4 and p.name = 'Long Sleeve Tee' and p.cat = 'long-sleeves');

insert into public.products (name, cat, price, img, colors, stock, active)
select 'Y Signature Cap', 'caps', 39, '/images/products/enhanced/caps/caps_black.png',
  '[["Black","#0b0b0c"],["White","#f2f0ec"],["Cream","#eadfca"],["Dark Grey","#3b3b3e"],["Olive Green","#4b5330"],["Brown","#4a2e20"],["Navy","#14213d"],["Pink","#e8b4bd"],["Light Blue","#9dbfe6"]]'::jsonb, 18, true
where not exists (select 1 from public.products where name = 'Y Signature Cap' and cat = 'caps')
union all
select 'Y Sport Headband', 'headbands', 25, '/images/products/enhanced/headbands/headbands_black.png',
  '[["Black","#0b0b0c"],["White","#f2f0ec"],["Cream","#eadfca"],["Dark Grey","#3b3b3e"],["Brown","#4a2e20"],["Navy","#14213d"],["Pink","#e8b4bd"],["Light Blue","#9dbfe6"]]'::jsonb, 18, true
where not exists (select 1 from public.products where name = 'Y Sport Headband' and cat = 'headbands');

select setval(
  pg_get_serial_sequence('public.products', 'id'),
  coalesce((select max(id) from public.products), 1),
  true
);

alter table public.order_items drop constraint if exists order_items_size_check;
alter table public.order_items
  add constraint order_items_size_check
  check (size in ('S', 'M', 'L', 'XL', 'XXL', 'ONE SIZE'));

create or replace function public.place_order(
  p_customer jsonb,
  p_lines jsonb,
  p_shipping text,
  p_payment text
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order_id uuid := gen_random_uuid();
  v_order_number text;
  v_item jsonb;
  v_product public.products%rowtype;
  v_product_id bigint;
  v_qty integer;
  v_size text;
  v_color text;
  v_subtotal numeric(10, 2) := 0;
  v_delivery numeric(10, 2);
  v_product_name text;
  v_unit_price numeric(10, 2);
  v_standard_delivery numeric(10, 2);
  v_express_delivery numeric(10, 2);
  v_free_shipping_threshold numeric(10, 2);
begin
  if coalesce(trim(p_customer ->> 'name'), '') = ''
    or coalesce(trim(p_customer ->> 'email'), '') = ''
    or coalesce(trim(p_customer ->> 'phone'), '') = ''
    or coalesce(trim(p_customer ->> 'address'), '') = ''
    or coalesce(trim(p_customer ->> 'emirate'), '') = '' then
    raise exception 'Customer details are incomplete.' using errcode = '22023';
  end if;

  if jsonb_typeof(p_lines) is distinct from 'array' then
    raise exception 'Order lines must be an array.' using errcode = '22023';
  end if;
  if jsonb_array_length(p_lines) < 1 or jsonb_array_length(p_lines) > 30 then
    raise exception 'Order must contain between 1 and 30 lines.' using errcode = '22023';
  end if;
  if p_shipping not in ('std', 'exp') or p_payment is distinct from 'cod' then
    raise exception 'Shipping or payment option is invalid.' using errcode = '22023';
  end if;

  select standard_delivery_aed, express_delivery_aed, free_shipping_threshold_aed
    into v_standard_delivery, v_express_delivery, v_free_shipping_threshold
    from public.store_settings where id = true;
  if not found then
    raise exception 'Store shipping settings are missing.' using errcode = '55000';
  end if;

  for v_item in select value from jsonb_array_elements(p_lines)
  loop
    begin
      v_product_id := (v_item ->> 'productId')::bigint;
      v_qty := (v_item ->> 'qty')::integer;
    exception when others then
      raise exception 'A product or quantity is invalid.' using errcode = '22023';
    end;
    v_size := v_item ->> 'size';
    v_color := v_item ->> 'color';

    if v_qty < 1 or v_qty > 20 or v_size not in ('S', 'M', 'L', 'XL', 'XXL', 'ONE SIZE') then
      raise exception 'A product quantity or size is invalid.' using errcode = '22023';
    end if;

    select * into v_product from public.products
      where id = v_product_id and active = true for update;
    if not found then
      raise exception 'A product is no longer available.' using errcode = 'P0001';
    end if;
    if (v_product.cat in ('caps', 'headbands') and v_size <> 'ONE SIZE')
      or (v_product.cat not in ('caps', 'headbands') and v_size = 'ONE SIZE') then
      raise exception 'The selected size is not available for this product.' using errcode = '22023';
    end if;
    if v_product.stock < v_qty then
      raise exception 'There is not enough stock for %.', v_product.name using errcode = 'P0001';
    end if;
    if not exists (
      select 1 from jsonb_array_elements(v_product.colors) as color_option(value)
      where color_option.value ->> 0 = v_color
    ) then
      raise exception 'A selected colour is not available.' using errcode = '22023';
    end if;

    v_subtotal := v_subtotal + v_product.price * v_qty;
    update public.products set stock = stock - v_qty, updated_at = now() where id = v_product_id;
  end loop;

  v_delivery := case when p_shipping = 'exp' then v_express_delivery
    when v_subtotal >= v_free_shipping_threshold then 0 else v_standard_delivery end;
  v_order_number := 'Y-' || upper(substr(replace(v_order_id::text, '-', ''), 1, 8));

  insert into public.orders (
    id, order_number, user_id, customer, shipping, payment, subtotal, delivery, total
  ) values (
    v_order_id, v_order_number, (select auth.uid()), p_customer, p_shipping, p_payment,
    v_subtotal, v_delivery, v_subtotal + v_delivery
  );

  for v_item in select value from jsonb_array_elements(p_lines)
  loop
    v_product_id := (v_item ->> 'productId')::bigint;
    v_size := v_item ->> 'size';
    v_color := v_item ->> 'color';
    v_qty := (v_item ->> 'qty')::integer;
    select name, price into v_product_name, v_unit_price from public.products where id = v_product_id;
    insert into public.order_items (order_id, product_id, product_name, size, color, qty, unit_price)
    values (v_order_id, v_product_id, v_product_name, v_size, v_color, v_qty, v_unit_price);
  end loop;

  return v_order_number;
end;
$$;

revoke all on function public.place_order(jsonb, jsonb, text, text) from public;
grant execute on function public.place_order(jsonb, jsonb, text, text) to anon, authenticated;

commit;
