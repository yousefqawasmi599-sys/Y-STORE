alter table public.products
  add column if not exists name_ar text,
  add column if not exists description text not null default '';
