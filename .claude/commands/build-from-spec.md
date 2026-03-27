# Build Collection Module from Spec

You are an expert at building Root Platform collection modules. The user has provided a provider specification document (PDF, markdown, or description). Your job is to read it, extract all necessary information, and generate a complete, working implementation plan with scaffolded code.

## Step 1: Extract Provider Information

Read the provided document and extract:

| Field | Description |
|---|---|
| **Provider name** | e.g. "GoCardless", "PayFast", "Peach Payments" |
| **API type** | REST (HTTP) or SDK (npm package) |
| **Auth method** | API key in header / OAuth / HMAC signature |
| **Base URL** | e.g. `https://api.gocardless.com` |
| **Webhook format** | How webhooks are sent (HTTP POST, signature header name) |
| **Webhook events** | List of events the module must handle |
| **Core operations** | Which of: createCustomer, createPaymentIntent, createSubscription, attachPaymentMethod, cancelSubscription |
| **Config fields needed** | API keys, secrets, webhook signing secrets, product IDs |

If any field is missing from the doc, ask the user before proceeding.

## Step 2: Map to Template Structure

Map extracted info to these files (all under `collection_module/code/`):

```
clients/{provider}-client.ts         ← API wrapper (SDK or BaseHttpClient)
services/{provider}.service.ts       ← Business logic
adapters/{provider}-to-root-adapter.ts ← Data transformation
interfaces/{provider}-events.ts      ← Webhook event constants
core/container.setup.ts              ← DI registration (update existing)
webhook-hooks.ts                     ← Event routing (update existing)
lifecycle-hooks/                     ← Root Platform callbacks (update existing)
env.sample.ts                        ← Config placeholders (update existing)
```

Tests go in `collection_module/__tests__/` mirroring the above structure.

## Step 3: Generate Implementation Plan

Output a numbered plan with:
1. Each file to create or modify
2. The exact implementation for each file (full code, not pseudocode)
3. DI registration snippet for `container.setup.ts`
4. Webhook routing additions for `webhook-hooks.ts`
5. Any lifecycle hook changes needed
6. Test file scaffolds with mock factories

### Client Pattern

**If provider has an SDK:**
```typescript
// code/clients/{provider}-client.ts
import ProviderSDK from '{provider-sdk-package}';
import { getConfigService } from '../services/config-instance';
import { PaymentProviderClient, WebhookRequest } from '../interfaces/provider.interfaces';

export default class {Provider}Client implements PaymentProviderClient {
  public readonly sdk: ProviderSDK;

  constructor() {
    const config = getConfigService();
    this.sdk = new ProviderSDK(config.get('providerSecretKey'));
  }

  verifyWebhookSignature(request: WebhookRequest, secret: string): boolean {
    // Use SDK's signature verification
  }
}
```

**If provider uses REST (no SDK):**
```typescript
// code/clients/{provider}-client.ts
import { BaseHttpClient } from './base-http-client';
import { getConfigService } from '../services/config-instance';
import { PaymentProviderClient, WebhookRequest } from '../interfaces/provider.interfaces';

export default class {Provider}Client implements PaymentProviderClient {
  public readonly sdk: BaseHttpClient;

  constructor() {
    const config = getConfigService();
    this.sdk = new BaseHttpClient({
      baseUrl: '{BASE_URL}',
      apiKey: config.get('providerSecretKey'),
    });
  }

  verifyWebhookSignature(request: WebhookRequest, secret: string): boolean {
    // Implement HMAC/signature check
  }
}
```

### Service Pattern
```typescript
// code/services/{provider}.service.ts
import { LogService } from './log.service';
import {Provider}Client from '../clients/{provider}-client';
import { PaymentProviderService, ProviderCustomer, ... } from '../interfaces/provider.interfaces';
import { retryWithBackoff } from '../utils/retry';
import { ModuleError } from '../utils/error';

export class {Provider}Service implements PaymentProviderService {
  constructor(
    private readonly logService: LogService,
    private readonly providerClient: {Provider}Client,
  ) {}

  async createCustomer(params: CreateCustomerParams): Promise<ProviderCustomer> {
    this.logService.info('Creating customer', '{Provider}Service', params);
    return retryWithBackoff(() => this.providerClient.sdk.customers.create(params));
  }
  // ... remaining methods
}
```

### Adapter Pattern
```typescript
// code/adapters/{provider}-to-root-adapter.ts
import { ProviderToRootAdapter } from '../interfaces/provider.interfaces';

export default class {Provider}ToRootAdapter implements ProviderToRootAdapter {
  convertPaymentToRootUpdate(providerPayment: any, params: ConvertPaymentParams) {
    return {
      status: this.mapStatus(providerPayment.status),
      amount: providerPayment.amount,
      currency: providerPayment.currency,
      externalId: providerPayment.id,
    };
  }

  convertCustomerToAppData(providerCustomer: any) {
    return {
      {provider}_customer_id: providerCustomer.id,
    };
  }

  private mapStatus(status: string): string {
    const map: Record<string, string> = { /* provider status → root status */ };
    return map[status] ?? status;
  }
}
```

### DI Registration
```typescript
// Add to code/core/container.setup.ts
container.register(
  ServiceToken.PROVIDER_CLIENT,
  () => new (require('../clients/{provider}-client').default)(),
  ServiceLifetime.SINGLETON,
);

container.register(
  ServiceToken.PROVIDER_SERVICE,
  (c) => {
    const log = c.resolve<LogService>(ServiceToken.LOG_SERVICE);
    const client = c.resolve(ServiceToken.PROVIDER_CLIENT);
    return new (require('../services/{provider}.service').{Provider}Service)(log, client);
  },
  ServiceLifetime.SINGLETON,
);
```

## Step 4: Checklist

After generating all files, output this checklist:

- [ ] Client created and implements `PaymentProviderClient`
- [ ] Service created and implements `PaymentProviderService`
- [ ] Adapter created and implements `ProviderToRootAdapter`
- [ ] Client registered as `PROVIDER_CLIENT` in container.setup.ts
- [ ] Service registered as `PROVIDER_SERVICE` in container.setup.ts
- [ ] Webhook signature verification implemented
- [ ] Webhook events routed in webhook-hooks.ts
- [ ] Lifecycle hooks wired (payment method, policy, payment)
- [ ] env.sample.ts updated with provider config fields
- [ ] Tests scaffolded for client, service, adapter
- [ ] `LogService` used (not console.log) throughout
- [ ] `ModuleError` used for all thrown errors
- [ ] `retryWithBackoff` used for all external API calls

## Notes

- Config fields must use provider-agnostic names: `providerSecretKey`, `providerPublishableKey`, `providerWebhookSigningSecret`
- DI tokens must be provider-agnostic: `PROVIDER_CLIENT`, `PROVIDER_SERVICE`
- Controllers are thin (<100 lines); business logic goes in services
- Adapters are pure functions — no API calls allowed
- All logging via `LogService`, never `console.log`
- Reference the Stripe implementation in `code/clients/stripe-client.ts`, `code/services/stripe.service.ts`, `code/adapters/stripe-to-root-adapter.ts` as working examples
