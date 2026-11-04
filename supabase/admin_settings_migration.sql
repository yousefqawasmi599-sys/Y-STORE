create table if not exists public.store_settings (
  id boolean primary key default true check (id),
  standard_delivery_aed numeric(10, 2) not null check (standard_delivery_aed >= 0),
  express_delivery_aed numeric(10, 2) not null check (express_delivery_aed >= 0),
  free_shipping_threshold_aed numeric(10, 2) not null check (free_shipping_threshold_aed >= 0),
  updated_at timestamptz not null default now()
);

insert into public.store_settings (
  id, standard_delivery_aed, express_delivery_aed, free_shipping_threshold_aed
) values (true, 25, 50, 300)
on conflict (id) do nothing;

alter table public.store_settings enable row level security;

drop policy if exists "Public can read shipping settings" on public.store_settings;
create policy "Public can read shipping settings" on public.store_settings
  for select to anon, authenticated using (true);

drop policy if exists "Admins can update shipping settings" on public.store_settings;
create policy "Admins can update shipping settings" on public.store_settings
  for update to authenticated using ((select public.is_admin()))
  with check ((select public.is_admin()));

grant select on public.store_settings to anon, authenticated;
grant update on public.store_settings to authenticated;

drop policy if exists "Admins can mark contact messages as read" on public.contact_messages;
create policy "Admins can mark contact messages as read" on public.contact_messages
  for update to authenticated using ((select public.is_admin()))
  with check ((select public.is_admin()));
grant update on public.contact_messages to authenticated;

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

    if v_qty < 1 or v_qty > 20 or v_size not in ('S', 'M', 'L', 'XL', 'XXL') then
      raise exception 'A product quantity or size is invalid.' using errcode = '22023';
    end if;

    select * into v_product from public.products
      where id = v_product_id and active = true for update;
    if not found then
      raise exception 'A product is no longer available.' using errcode = 'P0001';
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
