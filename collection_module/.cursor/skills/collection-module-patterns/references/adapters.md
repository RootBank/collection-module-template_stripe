# Adapters (Reference)

Stripe API → StripeToRootAdapter → Root Platform API. Adapters convert between formats; pure transformation, no side effects.

## StripeToRootAdapter

- **convertInvoiceToRootPayment(invoice, { status, failureReason?, failureAction? })**: Returns `{ status, failure_reason, failure_action }` for Root payment update. Use for invoice.paid / invoice.payment_failed.
- **convertCustomerToAppData(customer)**: Returns `{ stripe_customer_id, stripe_email, stripe_default_payment_method, stripe_created_at }` for policy app_data.

## When to Use

Use: Converting webhook data to Root updates, mapping complex objects, standardizing dates/amounts/statuses. Don't: Simple assignment, API calls (clients), business logic (services), validation (validation libs).

## Creating an Adapter

Pure methods; input → output. Handle null/undefined. Document mapping rules. No API calls, no mutation of inputs.

## Patterns

Status mapping (object map), date conversion (unix → ISO), amount to minor units, field renaming with transforms.

Do: Pure, null-safe, typed, well-tested. Don't: API calls, business logic, mutating input, throwing (prefer defaults).
