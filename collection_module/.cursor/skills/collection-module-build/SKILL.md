---
name: collection-module-build
description: Builds a complete collection module implementation from a provider spec document (PDF, markdown, or description). Use when a user uploads a spec, provides provider API docs, or asks to implement a new payment provider from scratch.
---

# Build Collection Module from Provider Spec

## What to do when given a spec doc

1. **Extract** the required fields from the document (see checklist below)
2. **Ask** for any missing fields before writing code
3. **Scaffold** all files using the patterns in this skill
4. **Output** the implementation checklist at the end

---

## Required Information to Extract

| Field | Where to find it in the doc |
|---|---|
| Provider name | Title, introduction |
| API type | SDK (npm package) or REST |
| Base URL | API reference section |
| Auth method | Authentication section (API key, OAuth, HMAC) |
| Auth header name | e.g. `Authorization: Bearer`, `X-API-Key` |
| Webhook signature header | e.g. `Stripe-Signature`, `X-PayFast-Signature` |
| Webhook events to handle | Events/webhooks section |
| Core operations needed | payment, subscription, customer management |
| Config fields | API keys, secrets, webhook signing secret, product/merchant IDs |

---

## File Map — What to Create/Modify

```
CREATE  code/clients/{provider}-client.ts
CREATE  code/services/{provider}.service.ts
CREATE  code/adapters/{provider}-to-root-adapter.ts
CREATE  code/interfaces/{provider}-events.ts
MODIFY  code/core/container.setup.ts       ← register PROVIDER_CLIENT + PROVIDER_SERVICE
MODIFY  code/webhook-hooks.ts              ← add signature verify + event routing
MODIFY  code/lifecycle-hooks/*.ts          ← wire policy/payment/method hooks
MODIFY  code/env.sample.ts                 ← add provider config placeholders
CREATE  __tests__/clients/{provider}-client.test.ts
CREATE  __tests__/services/{provider}.service.test.ts
CREATE  __tests__/adapters/{provider}-to-root-adapter.test.ts
```

---

## Client Implementation

**SDK-based provider:**
```typescript
import ProviderSDK from '{sdk-package}';
import { getConfigService } from '../services/config-instance';
import { PaymentProviderClient, WebhookRequest } from '../interfaces/provider.interfaces';

export default class {Provider}Client implements PaymentProviderClient {
  public readonly sdk: ProviderSDK;

  constructor() {
    const config = getConfigService();
    this.sdk = new ProviderSDK(config.get('providerSecretKey'));
  }

  verifyWebhookSignature(request: WebhookRequest, secret: string): boolean {
    // Use SDK signature verification
    return true;
  }
}
```

**REST-only provider (no SDK):**
```typescript
import { BaseHttpClient } from './base-http-client';
import { getConfigService } from '../services/config-instance';
import { PaymentProviderClient, WebhookRequest } from '../interfaces/provider.interfaces';
import * as crypto from 'crypto';

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
    const sig = request.headers['{signature-header}'];
    const expected = crypto
      .createHmac('sha256', secret)
      .update(request.body)
      .digest('hex');
    return sig === expected;
  }
}
```

---

## Service Implementation

```typescript
import { LogService } from './log.service';
import {Provider}Client from '../clients/{provider}-client';
import {
  PaymentProviderService,
  ProviderCustomer,
  ProviderPaymentIntent,
  ProviderPaymentMethod,
  ProviderSubscription,
  CreateCustomerParams,
  UpdateCustomerParams,
  CreatePaymentIntentParams,
  AttachPaymentMethodParams,
} from '../interfaces/provider.interfaces';
import { retryWithBackoff } from '../utils/retry';
import { ModuleError } from '../utils/error';

export class {Provider}Service implements PaymentProviderService {
  constructor(
    private readonly logService: LogService,
    private readonly providerClient: {Provider}Client,
  ) {}

  async createCustomer(params: CreateCustomerParams): Promise<ProviderCustomer> {
    this.logService.info('Creating customer', '{Provider}Service', params);
    try {
      const result = await retryWithBackoff(() =>
        this.providerClient.sdk./* provider call */,
      );
      return { id: result.id, email: result.email, name: result.name };
    } catch (err) {
      throw new ModuleError('Failed to create customer', { cause: err });
    }
  }
  // Implement: getCustomer, updateCustomer, createPaymentIntent,
  //            getPaymentMethod, attachPaymentMethod, cancelSubscription
}
```

---

## Adapter Implementation

```typescript
import {
  ProviderToRootAdapter,
  ConvertPaymentParams,
} from '../interfaces/provider.interfaces';

export default class {Provider}ToRootAdapter implements ProviderToRootAdapter {
  convertPaymentToRootUpdate(providerPayment: any, params: ConvertPaymentParams) {
    return {
      status: this.mapStatus(providerPayment.status, params),
      amount: providerPayment.amount,
      currency: providerPayment.currency,
      externalId: providerPayment.id,
    };
  }

  convertCustomerToAppData(providerCustomer: any): Record<string, any> {
    return {
      {provider}_customer_id: providerCustomer.id,
      {provider}_email: providerCustomer.email,
    };
  }

  private mapStatus(providerStatus: string, params: ConvertPaymentParams): string {
    const statusMap: Record<string, string> = {
      // 'provider_status': 'root_status'
    };
    return statusMap[providerStatus] ?? providerStatus;
  }
}
```

---

## DI Registration (add to container.setup.ts)

```typescript
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

---

## env.sample.ts additions

```typescript
providerSecretKey: '{PROVIDER}_SECRET_KEY',
providerPublishableKey: '{PROVIDER}_PUBLISHABLE_KEY',  // if applicable
providerWebhookSigningSecret: '{PROVIDER}_WEBHOOK_SECRET',
providerProductId: '{PROVIDER}_PRODUCT_ID',            // if applicable
```

---

## Implementation Checklist

Output this when done:

- [ ] Client implements `PaymentProviderClient` interface
- [ ] Service implements `PaymentProviderService` interface
- [ ] Adapter implements `ProviderToRootAdapter` interface
- [ ] `PROVIDER_CLIENT` registered in container.setup.ts
- [ ] `PROVIDER_SERVICE` registered in container.setup.ts
- [ ] Webhook signature verification implemented
- [ ] Webhook events routed in webhook-hooks.ts
- [ ] Lifecycle hooks wired (payment method, policy, payment)
- [ ] env.sample.ts updated
- [ ] Tests scaffolded
- [ ] No `console.log` — all logging via `LogService`
- [ ] All errors thrown as `ModuleError`
- [ ] All external calls wrapped in `retryWithBackoff`

---

## Reference Implementation

The Stripe implementation is the working reference for all patterns:
- Client: `code/clients/stripe-client.ts`
- Service: `code/services/stripe.service.ts`
- Adapter: `code/adapters/stripe-to-root-adapter.ts`
- Events: `code/interfaces/stripe-events.ts`
