# Testing Premium Checkout (Stripe test mode)

## Prerequisites

`backend/.env` needs all four Stripe vars filled in:

```
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PREMIUM_PRICE_ID=price_...
```

- `STRIPE_SECRET_KEY` / `STRIPE_PUBLISHABLE_KEY` — Stripe Dashboard → Developers → API keys (test mode).
- `STRIPE_PREMIUM_PRICE_ID` — Stripe Dashboard → Product catalog → create a "Librora Premium" product
  with a recurring price, then copy the Price ID. Can also be done via Stripe CLI:
  ```bash
  stripe products create --name "Librora Premium"
  stripe prices create --product prod_xxx --unit-amount 900 --currency usd -d "recurring[interval]=month"
  ```
- `STRIPE_WEBHOOK_SECRET` — only available while `stripe listen` is running locally (see below).
  Stripe Dashboard webhook URLs don't work for `localhost`, so local testing requires the CLI instead.

After changing `.env`, rebuild/restart the API container:
```bash
docker compose up --build -d api
```

## Stripe CLI setup (Windows, no admin rights needed)

Chocolatey requires an elevated shell; if unavailable, download the CLI binary directly:
```bash
curl -sL "https://api.github.com/repos/stripe/stripe-cli/releases/latest" \
  | grep -o '"browser_download_url": *"[^"]*windows_x86_64.zip"'
# download + unzip that URL, then run stripe.exe directly
```

`stripe login` can time out over some networks — if so, use `--api-key` instead of logging in:
```bash
stripe listen --api-key "$STRIPE_SECRET_KEY" --forward-to localhost:3001/api/v1/billing/webhook
```

This prints the webhook signing secret (`whsec_...`) needed above. **Must stay running** for the
whole test session — it forwards Stripe events to your local API.

## Manual E2E test

1. Confirm `stripe listen` is running and forwarding to `localhost:3001/api/v1/billing/webhook`.
2. Open `http://localhost:4173/plan`, logged in as a Free-plan user.
3. Click **"Upgrade to Premium"** → redirects to Stripe's hosted Checkout page.
4. Fill in test card details:
   - Card number: `4242 4242 4242 4242`
   - Expiry: any future date (e.g. `12/34`)
   - CVC: any 3 digits (e.g. `123`)
   - Name/address: anything
5. Submit payment → redirected back to `/plan?checkout=success`.
6. Page shows a "processing" toast and refetches plan usage — should flip to **Premium** once the
   `checkout.session.completed` webhook lands (usually within a couple seconds).
7. Confirm in `stripe listen`'s terminal output that the webhook was forwarded and got a `200`
   (not `503`/`401`) from the API.

## Downgrade / cancellation test

- Use **"Manage billing"** (Stripe Billing Portal) from `/plan` while on Premium to cancel the
  subscription.
- Confirm the `customer.subscription.deleted` webhook fires and the account reverts to Free.

## Common issues

- **503 from the webhook endpoint** — `STRIPE_SECRET_KEY` not loaded in the running container
  (stale env; rebuild/restart `api`).
- **`stripe listen` network timeouts** — transient; retry the command. A `curl` request to
  `api.stripe.com` succeeding while the CLI times out points to a CLI-specific hiccup, not a real
  outage.
- **Duplicate prices** — if a `stripe prices create` call times out client-side but actually
  succeeded server-side, check for duplicates via `GET /v1/prices?product=prod_xxx` and deactivate
  extras with `active=false`.
