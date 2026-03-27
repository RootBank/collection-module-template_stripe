---
name: collection-module-integration
description: Implements payment provider integration for the Collection Module: webhooks, lifecycle hooks, and template customization. Use when implementing webhook handlers, Root Platform lifecycle hooks, customizing the template for a specific provider, configuring webhook endpoints, or wiring event processors.
---

# Collection Module Integration

## Overview

Template provides structure; you complete: Stripe client config, service method implementations, webhook event controllers, lifecycle hook logic, and adapters for Stripe ↔ Root data.

## Webhooks

- **Flow**: Stripe → Lambda → verify signature → route by event type → controller → Root.
- **Setup**: Deploy Lambda; register endpoint in Stripe Dashboard; select events (invoice.paid, invoice.payment_failed, payment_intent.succeeded/failed, etc.); set STRIPE_WEBHOOK_SIGNING_SECRET.
- **Handler**: In `webhook-hooks.ts`, verify with `stripe.webhooks.constructEvent(body, signature, secret)`; switch on `event.type`; resolve controller from container; `await controller.handle(event)`.
- **Security**: Always verify signature; return 400 on failure. Use raw body and correct header.
- **Idempotency**: Track processed event IDs; use persistent store in production.

See [references/webhooks.md](references/webhooks.md) for setup, routing, retries, and local testing.

## Lifecycle Hooks

- **Payment method**: renderCreatePaymentMethod (HTML form), createPaymentMethod (return module data), renderViewPaymentMethod / renderViewPaymentMethodSummary.
- **Policy**: afterPolicyIssued, afterPolicyPaymentMethodAssigned, afterPolicyUpdated, afterPolicyCancelled (create customer, attach PM, update/cancel subscription).
- **Payment**: afterPaymentCreated (create payment intent), afterPaymentUpdated.
- **Alteration**: afterAlterationPackageApplied.
- **Pattern**: Log entry/exit; validate; use services/clients; keep thin; idempotency where needed (e.g. afterPaymentCreated).

See [references/lifecycle-hooks.md](references/lifecycle-hooks.md) for parameters and examples.

## Customizing the Template

1. Stripe client: init SDK with config key; expose webhook constructEvent.
2. Stripe service: implement createCustomer, createSubscription, createPaymentIntent, attachPaymentMethod, etc.; use LogService and adapters.
3. Controllers: one per webhook event; validate metadata (e.g. rootPaymentId); call RootService/StripeService.
4. Wire webhook-hooks.ts and lifecycle-hooks/index.ts.
5. Adapters: StripeToRootAdapter for invoice/customer → Root; status and date/amount mapping.
6. Validation: schemas for inputs; validate before calling APIs.

See [references/customizing.md](references/customizing.md) for step-by-step and checklist.

## Additional Resources

- [references/customizing.md](references/customizing.md) — Implementation steps and testing
- [references/webhooks.md](references/webhooks.md) — Webhook setup, security, idempotency, debugging
- [references/lifecycle-hooks.md](references/lifecycle-hooks.md) — Hook list, parameters, patterns
