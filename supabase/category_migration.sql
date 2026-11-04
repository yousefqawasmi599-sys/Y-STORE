create table if not exists public.categories (
  slug text primary key check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  label text not null unique check (length(label) between 1 and 60),
  img text not null default '/images/cat-1.jpg',
  active boolean not null default true,
  created_at timestamptz not null default now()
);

insert into public.categories (slug, label, img) values
  ('hoodies', 'Hoodies', '/images/cat-3.jpg'),
  ('tees', 'T-Shirts', '/images/cat-1.jpg'),
  ('long-sleeves', 'Long Sleeves', '/images/cat-2.jpg')
on conflict (slug) do nothing;

alter table public.products drop constraint if exists products_cat_check;
alter table public.products drop constraint if exists products_cat_category_fk;

update public.products set cat = 'hoodies' where cat = 'hoodie';
update public.products set cat = 'tees' where cat = 'tee';
update public.products set cat = 'long-sleeves' where cat = 'ls';

alter table public.products
  add constraint products_cat_category_fk foreign key (cat)
  references public.categories (slug) on update cascade;

alter table public.categories enable row level security;

drop policy if exists "Public can read active categories" on public.categories;
create policy "Public can read active categories" on public.categories
  for select to anon, authenticated using (active or (select public.is_admin()));

drop policy if exists "Admins manage categories" on public.categories;
create policy "Admins manage categories" on public.categories
  for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

grant select on public.categories to anon, authenticated;
grant insert, update on public.categories to authenticated;