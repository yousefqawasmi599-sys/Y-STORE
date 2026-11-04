revoke all on public.profiles, public.categories, public.products, public.orders, public.order_items, public.contact_messages, public.newsletter_subscribers, public.store_settings from anon, authenticated;
grant select on public.categories, public.products, public.store_settings to anon, authenticated;
grant select on public.profiles, public.orders, public.order_items, public.contact_messages, public.newsletter_subscribers to authenticated;
grant insert, update on public.categories, public.products to authenticated;
grant insert on public.contact_messages, public.newsletter_subscribers to anon, authenticated;
grant update on public.contact_messages, public.store_settings to authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.admin_set_order_status(text,text) from public, anon;
grant execute on function public.admin_set_order_status(text,text) to authenticated;
