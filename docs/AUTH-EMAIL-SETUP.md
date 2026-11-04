# Email and security activation status

Local code includes signup confirmation, existing-account passwordless email OTP, resend cooldown, password reset, 12-character signup/reset checks, API origin checks and an enforced production Content Security Policy. Passwordless OTP is an alternative login method, not a second authentication factor. Supabase enforces actual code expiry, attempts, passwords and confirmation settings; browser checks do not replace server configuration.

## Hosted settings applied on 2026-11-01

Verified email confirmation is required; email provider is enabled; anonymous sign-ins and manual identity linking remain disabled. Saved OTP length 6, OTP expiry 600 seconds, minimum password length 12, secure email change enabled, and secure password change enabled. Saved limits: OTP verification 10 requests per 5 minutes per IP, signups/sign-ins 15 per 5 minutes per IP. Enabled security emails for password/email changes, sign-in method linked/removed, and MFA method added/removed. Site URL is `http://localhost:3011`; allowed callbacks are the base callback and its account/reset-password query variants.

Custom templates are NOT deployed: this project's dashboard requires custom SMTP or a paid upgrade to edit them. No upgrade was purchased. Sending and receiving an OTP has NOT been verified. The built-in templates may send links instead of numeric codes until the supplied templates are installed with custom SMTP. Leaked-password protection is paid-plan-only on this project and was not enabled. MFA enrollment and CAPTCHA are not enabled.

## Settings reference and remaining provider setup

Project: `egfdzzffslbucpolbsis`. Open Authentication in the project dashboard:

- Email provider: enabled; email confirmation required; OTP length 6; expiry 600 seconds; resend interval 60 seconds.
- Password minimum: 12 characters. Enable leaked-password protection when available on the project's plan. Do not lower protection to work around setup issues.
- Site URL: `http://localhost:3011` for this local preview. Redirect allowlist: exact `http://localhost:3011/auth/callback` (include the intended account/recovery query variants if the dashboard requires exact full URL matching). Replace/add the production HTTPS origin and callback before launch; no broad wildcards.
- Confirm signup template: paste `supabase/templates/confirmation.html`.
- Magic link template: paste `supabase/templates/magic-link.html` (the Token variable makes this an OTP email).
- Reset password template: paste `supabase/templates/recovery.html`.
- Secure email changes and secure password changes: enable; reauthentication may require an additional user code flow before old sessions can change passwords.
- Configure auth rate limits for the expected traffic. Enable CAPTCHA only after integrating its site key and challenge in the forms; turning it on alone breaks signup/sign-in.
- Protect the Supabase owner account with MFA. For app-admin MFA, add enrollment/challenge UI and enforce AAL2 in both server and database policies together; it is not activated by this setup.

## SMTP needed for public delivery

The built-in sender is for development and authorized team addresses; it is not public production email delivery. Choose a provider, verify your sending domain via its DNS records, and configure Authentication > Emails > SMTP with:

```text
Host: from provider
Port: from provider (typically 465 or 587)
User: from provider
Password: enter directly in the secure dashboard field
Sender address: verified address on your domain
Sender name: Y Store
```

Do not put SMTP passwords or provider API secrets in NEXT_PUBLIC variables, source files, GitHub, or chat. Disable link tracking for authentication messages. Provider purchase/account creation/domain verification requires owner action. No provider subscription has been purchased and no custom SMTP is connected yet.

## Verification before claiming activation

1. Save the hosted settings and templates, then create an account with an address allowed by the configured sender.
2. Verify one valid OTP, then confirm the same code cannot be reused. Check invalid/expired codes and resend throttling.
3. Test passwordless OTP for an existing account; unknown addresses must not silently create accounts.
4. Test password recovery on a second browser/device and confirm private/admin endpoints reject signed-out users.
5. Check provider delivery logs and Supabase Auth logs. Do not mark emails as active until receipt and verification succeed.

References: [SMTP](https://supabase.com/docs/guides/auth/auth-smtp), [email OTP](https://supabase.com/docs/guides/auth/auth-email-passwordless), [security advisor guidance](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable).
