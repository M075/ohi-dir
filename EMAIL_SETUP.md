# Transactional email (Brevo)

All outbound mail goes through Brevo's transactional API. Three files, one job each:

| File | Responsibility |
| --- | --- |
| `utils/brevo.js` | Transport. One `POST` to Brevo, with timeout, retries and graceful no-op. |
| `utils/emailTemplates.js` | Message content. Pure functions returning `{ subject, html, text }`. |
| `utils/email.js` | **The only module routes should import.** Per-event send functions that never throw. |

## Finish the setup

Mail is **skipped and logged, never sent** until both of these are set. That is deliberate —
local development works untouched.

### 1. `BREVO_API_KEY` — done

Already in `.env`. Create or rotate it under **Brevo → SMTP & API → API keys** (v3 keys start
`xkeysib-`).

### 2. `BREVO_API_KEY` must not be IP-restricted

Brevo currently rejects this key from unrecognised IP addresses:

```
"We have detected you are using an unrecognised IP address …", code: "unauthorized"
```

Turn the restriction off at **https://app.brevo.com/security/authorised_ips**. Allow-listing
specific IPs is not a workable alternative here: Vercel's egress addresses rotate, so a
restricted key would fail unpredictably in production.

### 3. `EMAIL_FROM` — still empty

Set it to an address Brevo has verified, under **Brevo → Senders, domains & dedicated IPs**.
An unverified sender makes every send fail with a 400.

Use a subdomain you control (`no-reply@mail.ohidirectory.co.za`) and add Brevo's SPF, DKIM and
DMARC records. Without them, Gmail and Outlook will route the mail to spam even though Brevo
accepted it — which looks identical to "emails aren't working".

```ini
EMAIL_FROM=no-reply@yourdomain.co.za
EMAIL_REPLY_TO=support@yourdomain.co.za   # where buyer/seller replies land
```

Set the same values in **Vercel → Settings → Environment Variables**.

## Verifying it works

An admin-only endpoint renders a real template through the real transport and reports exactly
what Brevo said:

```bash
# Configuration status + list of template names
curl -H "Authorization: Bearer $ADMIN_TOKEN" \
  https://yourdomain.co.za/api/admin/email-test

# Send one sample
curl -X POST -H "Authorization: Bearer $ADMIN_TOKEN" -H "Content-Type: application/json" \
  -d '{"to":"you@example.com","template":"order-receipt"}' \
  https://yourdomain.co.za/api/admin/email-test
```

It also accepts an admin session, so it works from the browser while signed in as an admin.

## Optional environment variables

| Variable | Effect |
| --- | --- |
| `EMAIL_FROM_NAME` | Sender display name. Defaults to `Ohi!`. |
| `EMAIL_REPLY_TO` | Reply-to address. Defaults to `EMAIL_FROM`. |
| `EMAIL_BCC` | Silently copies every message — archive / audit trail. |
| `EMAIL_OVERRIDE_TO` | Redirects **all** mail to one address. Use this on staging so testing against production-shaped data doesn't email real buyers and sellers. |
| `EMAIL_DISABLED=true` | Drops every send without calling Brevo. |
| `EMAIL_DEBUG=true` | Logs recipients, subject and message id per send. |

Links inside emails are built from `NEXT_PUBLIC_DOMAIN` (falling back to `NEXTAUTH_URL`, then
`VERCEL_URL`). If that is wrong, every button in every email points at the wrong host.

## What gets sent, and from where

### Buyer

| Email | Trigger |
| --- | --- |
| Welcome | `POST /api/auth/register`, `POST /api/auth/signup` |
| Order confirmed / receipt | PayFast ITN confirms payment — `/api/payment/payfast/notify` |
| Payment failed | PayFast ITN reports a failed payment |
| Order cancelled (payment timeout) | `utils/expirePendingOrders.js` sweep |
| Order confirmed / being prepared | `PUT /api/orders/[id]/status` → `confirmed`, `processing` |
| Shipped, with tracking | ITN auto-books a shipment, `POST /api/courier/book`, or status → `shipped` |
| Delivered — review nudge | status → `delivered` |
| Order cancelled | status → `cancelled` |

### Seller

| Email | Trigger |
| --- | --- |
| New paid order, with ship-to details | PayFast ITN confirms payment |
| Order cancelled — stock returned | status → `cancelled` |
| Delivered — earnings released | status → `delivered` |
| Seller account active | `POST /api/users/upgrade-to-seller` |
| Payout received / approved / sent / declined | `/api/wallet/payout/request`, `/api/admin/payouts/[id]/{approve,complete,reject}` |
| Account suspended / reactivated | `PATCH /api/admin/stores/[id]`, `PATCH /api/admin/users/[userId]` |

### Admin

| Email | Trigger |
| --- | --- |
| Payout request to review | `POST /api/wallet/payout/request` — sent to every address in `ADMIN_EMAILS` |

### Password reset

`POST /api/auth/forgot-password` → emailed link → `/auth/reset-password?token=…` →
`POST /api/auth/reset-password` → confirmation email.

Notes on the implementation (`utils/passwordReset.js`):

- The raw token exists only in the email; its SHA-256 hash is what's stored on the user.
- Valid for 60 minutes, single use.
- The response is identical whether or not the address is registered, so the endpoint can't be
  used to enumerate accounts.
- A 90-second per-account cooldown stops it being used to flood someone's inbox.
- Google/Facebook accounts get an email pointing them back at their provider instead of a reset
  link — those accounts have no password, and issuing one would create a password login path on
  an account that deliberately has none.

## Adding an email

1. Add a template function to `utils/emailTemplates.js`. Build it from the declarative spec
   (`buildEmail({ heading, paragraphs, sections, cta })`) so the HTML and plain-text parts are
   generated from the same source and can't drift.
2. Add a `send…` wrapper to `utils/email.js`.
3. Call it from the route. **Await it** — on Vercel the function instance freezes once the
   response is returned, so an unawaited promise is silently dropped.
4. Register a sample in `app/api/admin/email-test/route.js` so it can be previewed.

Interpolate user-supplied values with `escapeHtml()`. Store names, product titles and addresses
are free text; an unescaped apostrophe breaks the markup.
