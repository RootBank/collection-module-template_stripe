# Customizing / Implementation Guide (Reference)

Template provides structure and stubs; you implement Stripe integration.

## Strategy

1. Configure Stripe client (`code/clients/stripe-client.ts`) — API key from config, webhook signature verification.
2. Implement Stripe service methods (`code/services/stripe.service.ts`) — createCustomer, getCustomer, createSubscription, createPaymentIntent, attachPaymentMethod, cancelSubscription, etc.; use LogService and map to domain models.
3. Implement webhook event processors (`code/controllers/stripe-event-processors/`) — e.g. processInvoicePaid, processInvoicePaymentFailed; get Root policy ID from metadata, call RootService to create/update payment.
4. Wire webhook handler (`code/webhook-hooks.ts`) — verify signature with StripeClient, switch on event.type, resolve controller, call handle.
5. Implement lifecycle hooks (`code/lifecycle-hooks/index.ts`) — afterPolicyPaymentMethodAssigned: get payment method, create/get Stripe customer, attach PM, set default, update policy app_data; afterPaymentCreated: create payment intent; afterPolicyCancelled: cancel subscription.
6. Add adapters (`code/adapters/stripe-to-root-adapter.ts`) — map Stripe payment intent/invoice/customer to Root formats; status mapping, date/amount conversion.
7. Add validation (e.g. code/validation/) — Joi schemas for createCustomer, createSubscription; validateAsync.

## Testing

Unit test services with mocked StripeClient/RootService; integration test workflows (create customer + subscription). Use Stripe test mode and test webhook delivery.

## Checklist

Configure client, implement service methods, add event controllers, wire webhook handler, implement lifecycle hooks, add adapters and validation, unit and integration tests, configure webhook URL in Stripe Dashboard.
