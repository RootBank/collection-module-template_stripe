# Webhooks (Reference)

Flow: Stripe → Lambda (API Gateway) → verify signature → route by event type → controller → Root API.

## Setup

1. Deploy Lambda; get API Gateway URL.
2. Stripe Dashboard → Developers → Webhooks → Add endpoint; URL = your endpoint; select events (e.g. invoice.paid, invoice.payment_failed, payment_intent.succeeded/failed, charge.refunded, charge.dispute.created, subscription events).
3. Copy signing secret (whsec_...); set STRIPE_WEBHOOK_SIGNING_SECRET_LIVE (env or code/env.ts).

## Security

Always verify signature: `stripe.webhooks.constructEvent(payload, signature, webhookSecret)`. Use raw body; correct header (stripe-signature). Return 400 on invalid signature.

## Event routing

In webhook-hooks.ts: parse event, switch on event.type, resolve controller from container, await controller.handle(event). Log eventId/type; catch, log, rethrow to trigger retry.

## Idempotency

Track processed event IDs (e.g. check before processing); only mark processed after success. Production: use persistent store (DynamoDB, Redis), not in-memory Set.

## Status codes

200–299: success (no retry). 400–499: client error (no retry, except 429). 500–599: server error (retry).

## Local testing

Stripe CLI: `stripe listen --forward-to http://localhost:3000/webhook`; `stripe trigger invoice.paid`. Or ngrok to expose local server; or mock events in __tests__/fixtures.

## Debugging

Signature failed: verify secret, raw body, header name. Timeouts: increase Lambda timeout or process async. Duplicates: idempotency by event ID. Missing webhooks: check endpoint URL, API Gateway, Lambda permissions.
