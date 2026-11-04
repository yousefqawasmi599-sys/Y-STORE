insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('product-images','product-images',true,5242880,array['image/jpeg','image/png','image/webp']) on conflict(id) do nothing;
create policy "Admins upload product images" on storage.objects for insert to authenticated
with check(bucket_id='product-images' and (select public.is_admin()));
-- Public bucket reads are intentional for storefront product photos. No guest writes.
