# Mercado Pago Checkout Pro

The application creates Checkout Pro **preferences** and receives **payment** Webhooks. Buyers pay on Mercado Pago; a return to the success URL is not proof of payment. Only a verified notification followed by a server-side payment lookup can confirm an order.

## Configuration

After the [one-time secure configuration setup](integration-configuration.md), manage the three Mercado Pago fields in **Admin → Configuración → Mercado Pago**. Existing environment values can be imported directly on the server. Never paste credentials into Git, ordinary business settings, screenshots, or logs. `NEXT_PUBLIC_APP_URL` remains an infrastructure setting.

| Variable | Purpose |
| --- | --- |
| `MERCADOPAGO_ACCESS_TOKEN` | Access token for the seller application/account |
| `MERCADOPAGO_WEBHOOK_SECRET` | Signing secret from the application's Webhooks configuration; distinct from the access token |
| `MERCADOPAGO_TEST_MODE` | Explicit `true` for test accounts, `false` for production; `TEST-` tokens also indicate test mode |
| `NEXT_PUBLIC_APP_URL` | Public HTTPS origin used for return and notification URLs |

Test-user credentials can have an `APP_USR-` prefix; the prefix alone does not establish a live integration. Never use the merchant token in browser code. Checkout Pro redirects do not require a browser public key in this implementation.

Both real and test-seller Checkout Pro preferences redirect through `init_point`, not `sandbox_init_point`. Test mode guards which payment environment may be accredited; it does not switch the checkout URL. See [Mercado Pago's test instructions](https://www.mercadopago.com.mx/developers/es/news/2023/11/16/Questions-on-how-to-test-your-integration--).

## Activation

1. Open the seller application in Mercado Pago **Tus integraciones**. Configure a public HTTPS payment notification endpoint at `/api/webhooks/mercadopago` under the correct test/production environment.
2. In Configuración → Mercado Pago, save its signing secret and matching seller access token. Set explicit test mode for test accounts.
3. Saved changes take effect on the next operation without redeploying. In Admin → Pagos, verify account connectivity and signing-secret presence. This check does not prove a webhook was delivered or that the account has permission to charge.
4. Select Mercado Pago for “Comprar 1” and/or as the provider for quote deposits and balances. Existing payment links retain their provider; balances must follow their deposit provider.
5. Run the acceptance checks below before enabling production. Account restrictions or policy reviews must be resolved with Mercado Pago; code cannot bypass them.

## Payment methods

OXXO disabled adds `payment_methods.excluded_payment_methods: [{ id: 'oxxo' }]`. Enabled allows it subject to account availability. Cash vouchers remain pending until Mercado Pago confirms receipt.

The legacy `payments_msi_enabled` setting controls installment availability: disabled sets `installments: 1`, enabled allows up to 12. This does **not** guarantee interest-free financing. Interest, eligible cards, and promotional terms depend on the merchant's Mercado Pago account and must be verified there.

## Notifications and recovery

Validate `x-signature` with HMAC-SHA256 using the signing secret, `x-request-id`, timestamp, and the notification's `data.id` query parameter. Reject malformed/invalid signatures before fetching payment details. Bind the verified payment to the expected order, provider, amount and MXN currency. Repeated notifications must not duplicate payments, advance an order twice, or send duplicate customer messages.

Return a retryable error for transient API/database failures. A 200 response acknowledges successful receipt; it must not hide processing failures unless the event was durably queued. Monitor the application's Webhooks delivery dashboard. Unsupported events can be acknowledged without changing orders.

The configured topic is **Payments (`payment`)** for Checkout Pro via Preferences API, not `order`. Dashboard simulations must use a payment ID that exists under the configured seller/environment; a fabricated ID will fail the authoritative API lookup. Configure signed Webhooks in the application dashboard; unsigned legacy IPN deliveries are rejected.

Customer/operator messages are best-effort and failures are logged. Payment and order state remain committed even if email or WhatsApp is unavailable. The payment link stays available in the admin order detail; automatic guaranteed message delivery would require a notification outbox.

## Acceptance checks

- Use distinct test seller and test buyer accounts, in separate browser sessions. Do not pay as the seller. Use Mercado Pago's test cards and documented test scenarios.
- Verify redirect URLs are public HTTPS and product pages work without admin authentication.
- Confirm an approved card payment changes exactly the expected pending payment/order, with the expected MXN amount including shipping.
- Confirm rejected payments do not start fulfillment. Confirm pending/OXXO payments remain pending until approval.
- Redeliver an approved notification; confirm no duplicate balance link, fulfillment, or messages. Test transient API/database failure then redelivery.
- Reject unsigned, tampered, wrong-order, wrong-provider, wrong-currency, and wrong-amount notifications without changing orders.
- Test a quote deposit followed by its balance, including duplicate deposit notifications and changing the configured default provider between both payments.
- Confirm OXXO visibility and installment limits match admin settings. Check the final checkout financing terms directly.

Refund/chargeback handling and delivery of best-effort notifications must be verified separately; a successful checkout alone does not establish those workflows. Automated tests use mocks and cannot prove account activation or delivery of live Webhooks.

Official references: [Checkout Pro Webhooks](https://www.mercadopago.com.mx/developers/en/docs/checkout-pro-preferences/additional-content/notifications/webhooks), [exclude payment methods](https://www.mercadopago.com.mx/developers/en/docs/checkout-pro-preferences/additional-settings/payment-methods), [test purchases](https://www.mercadopago.com.mx/developers/en/docs/checkout-pro-preferences/integration-test/test-purchases).
