# Clients (Reference)

Controllers → Services → Clients → External APIs. Clients are thin wrappers: config injection, expose SDK, no business logic.

## StripeClient

- `new StripeClient()`; uses ConfigurationService for `stripeSecretKey`.
- Access SDK: `stripeClient.stripeSDK.customers.create(...)`, `stripeSDK.setupIntents.create`, `stripeSDK.paymentIntents.create`, etc.
- Error handling done in services (catch, log, rethrow).

## RootClient

- Singleton: `import rootClient from '../clients/root-client'`. Do not instantiate with `new`.
- `rootClient.SDK.getPolicyById({ policyId })`, `updatePaymentsAsync`, `createPolicyPayment`, etc.
- Config: `rootApiKey`, `rootBaseUrl` from ConfigurationService.

## Creating a New Client

1. Create class; in constructor call `getConfigService()` and initialize SDK.
2. Add config keys to config service and env.
3. Use in services via constructor injection.

## Testing

Mock entire client: `stripeSDK: { customers: { create: jest.fn().mockResolvedValue({ id: 'cus_123' }) } }`. For RootClient, mock the default export `SDK` methods.

Do: Thin, expose SDK, use ConfigurationService, TypeScript types. Don't: Business logic, wrap every method, stateful clients.
