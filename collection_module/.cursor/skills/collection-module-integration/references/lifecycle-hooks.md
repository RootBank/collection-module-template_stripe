# Lifecycle Hooks (Reference)

Root Platform invokes hooks at policy/payment lifecycle points. Flow: Root event → hook → your logic → Stripe/Root.

## Payment method

- **renderCreatePaymentMethod()**: Return HTML (Stripe Elements form); create setup intent, pass publishable key and client_secret to RenderService.
- **createPaymentMethod({ data })**: Return { module: { id, usage, payment_method, status } } from setupIntent.
- **renderViewPaymentMethod(params)**, **renderViewPaymentMethodSummary(params)**: Return HTML; use RenderService; fetch payment method details from Stripe for summary.

## Policy

- **afterPolicyIssued({ policy })**: e.g. create Stripe customer, store stripe_customer_id in policy app_data.
- **afterPolicyPaymentMethodAssigned({ policy })**: Get payment method from Root; get/create Stripe customer; attach PM; set default; update policy app_data (stripe_customer_id, stripe_payment_method_id).
- **afterPolicyUpdated({ policy, updates })**: e.g. update Stripe subscription if billing changed.
- **afterPolicyCancelled({ policy })**: Cancel Stripe subscription if present.
- **afterPolicyExpired**, **afterPolicyLapsed**, **afterPaymentMethodRemoved**: Implement as needed.

## Payment

- **afterPaymentCreated({ policy, payment })**: Create Stripe payment intent (amount, currency, customer, metadata root_payment_id/root_policy_id); confirm, off_session.
- **afterPaymentUpdated({ policy, payment })**: React to payment updates.

## Alteration

- **afterAlterationPackageApplied({ policy, alteration_package, alteration_hook_key })**: e.g. update Stripe subscription when billing changes.

## Pattern

Log entry; validate inputs; call services/clients; log success; catch, log, throw. Keep hooks thin; use getLogService(), RootService, StripeClient. Idempotency: check payment.metadata for existing stripe_payment_intent_id before creating.
