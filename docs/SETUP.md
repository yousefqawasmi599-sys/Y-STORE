# Y Store setup

## Local development

Use Node.js 22 or newer.

```sh
npm ci
cp .env.example .env.local
npm run dev -- --port 3011
```

Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` (a publishable key is supported). Set `SITE_URL` to `http://localhost:3011` locally. Keep `NEXT_PUBLIC_API_URL` empty. Never use a service-role key in the browser. `.env.local` is ignored by Git and excluded from the delivery ZIP.

The existing Supabase project is `egfdzzffslbucpolbsis`. Its database is already initialized; do not reapply setup scripts there.

## Fresh database only

Run these SQL files once, in order:

1. `supabase/schema.sql`
2. `supabase/admin_settings_migration.sql`
3. `supabase/locker_room_migration.sql`
4. `supabase/access_hardening.sql`
5. `supabase/inventory_orders.sql`
6. `supabase/abuse_limits.sql`
7. `supabase/order_submission_limit.sql`
8. `supabase/product_images.sql`
9. `supabase/customer_orders.sql`

The existing project also needs step 9 once: it adds guest order tracking and customer cancellation, and does not change existing data.

The category and localization migration files are for older databases only; a fresh schema includes those fields already.

## Authentication and administrator

The connected project automatically grants admin to the owner's chosen email only after email verification. Signup and email confirmation are still required; no account/password was created on the owner's behalf. For a fresh project, optionally configure `supabase/owner_admin_setup.sql` with the chosen owner email, or use the manual SQL below.

In Supabase Authentication URL Configuration, set Site URL to the intended site origin. Allow the exact callback URL `http://localhost:3011/auth/callback` locally, and the deployed domain's `/auth/callback` later. Avoid wildcard production redirect URLs.

Create an account through `/login` and confirm the email. To grant a verified account administrator access, run this in the SQL Editor, replacing the email:

```sql
update public.profiles p set role = 'admin'
from auth.users u
where p.id = u.id and lower(u.email) = lower('you@example.com')
  and u.email_confirmed_at is not null
returning p.id, p.role;
```

Sign out and back in, then open `/admin`. Zero returned rows means the account is missing or not confirmed. No password is stored in source files. Configure custom SMTP before enabling public signups; the built-in sender has development restrictions. For cross-device verification, the signup email link can use `{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=signup&next=/account`.

## Inventory and orders

Admin product editor accepts inventory rows such as:

```text
Black|M|10
Black|L|8
White|M|4
```

Caps/headbands use `ONE SIZE`. Missing variants have zero stock. Total stock is calculated by the database. The starting quantities are demo quantities, allocated to Black/M or Black/ONE SIZE without increasing the old totals. Enter real quantities before selling.

Products in the shop and 3D room share the catalog and cart. Checkout locks products in a stable order, checks combined quantities, recalculates prices and shipping in the database, and deducts each variant atomically. A UUID request ID persists across checkout retries; an identical request returns the same order, while reusing its ID for different content is rejected. Cancellation restores each variant once. Payment is cash on delivery only.

Delivery rates are edited in Admin → Delivery rates; the database uses them for every new checkout. Guests follow an order at `/track` with the order number and checkout email; the lookup returns status, items and totals only, never phone or address, and shares the database submission limits. Signed-in customers can cancel their own order from `/account` while it is still New, which restores its stock once.

Admin image uploads support PNG/JPEG/WebP up to 5 MB. Product images are public; uploads require administrator access. Saving an uploaded URL in the product makes it visible in the store. The 3D room retains its original garment textures.

Submission limits run in the database for orders, contact and newsletter forms, including direct API calls. They supplement the per-instance IP limiter; they are not a substitute for hosting-level bot protection. The `private` schema must not be added to exposed Data API schemas. No public access policies on its internal tables is intentional. Reviewed security-definer functions are limited to order placement, admin order transitions and the admin-role lookup.

## Checks

```sh
npm test
npm run build
npm start -- --port 3011
```

Run `supabase/tests/customer_orders.sql` to test tracking privacy and customer cancellation. Run `supabase/tests/order_integrity.sql` in SQL Editor to test variant checks, duplicate requests, cancellation and authorization. It rolls back test orders/users. Unit tests cover inventory isolation and validation. Live email delivery and the owner's admin session need the owner's signup and configured email settings.

## GitHub and deployment

The clean delivery includes source, assets, SQL and tests, without dependency folders, build output or archives. Product images use the supplied HD sources rather than enlarged duplicates. Keep the lockfile; `npm ci` reproduces dependencies.

Before pushing, inspect `git status` and confirm `.env.local` is absent. When deploying, set environment values separately on the host, set `SITE_URL` to the HTTPS domain, and update Supabase redirect URLs.

The site remains a personal preview. Before selling, replace illustrative product shots/specifications with accurate product information and review shipping/returns/policy copy. Online payments, production email delivery and production-domain setup remain provider-specific work.
