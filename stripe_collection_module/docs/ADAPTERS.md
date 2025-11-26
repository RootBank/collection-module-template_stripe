# Adapters

This directory contains data transformation adapters that convert between different system formats.

Adapters handle:
- Data transformation between systems
- Field name and type mapping
- Business rule application during transformation
- Type safety enforcement

## Architecture

```
Stripe API → StripeToRootAdapter → Root Platform API
```

## Available Adapters

### StripeToRootAdapter

Converts Stripe data structures to Root Platform formats.

**Location**: `stripe-to-root-adapter.ts`

**Methods**:

#### convertInvoiceToRootPayment

Convert Stripe invoice to Root payment update parameters.

```typescript
import StripeToRootAdapter from '../adapters/stripe-to-root-adapter';
import { PaymentStatus } from '@rootplatform/node-sdk';

const adapter = new StripeToRootAdapter();

const paymentUpdate = adapter.convertInvoiceToRootPayment(stripeInvoice, {
  status: PaymentStatus.Successful,
  failureReason: 'Card declined',
  failureAction: FailureAction.BlockRetry,
});

// Returns: { status, failure_reason, failure_action }
```

Used when processing `invoice.paid` or `invoice.payment_failed` webhooks.

#### convertCustomerToAppData

Convert Stripe customer to Root policy app_data.

```typescript
const adapter = new StripeToRootAdapter();

const appData = adapter.convertCustomerToAppData(stripeCustomer);

await rootClient.SDK.updatePolicy({
  policyId,
  body: { app_data: appData },
});

// Returns: {
//   stripe_customer_id,
//   stripe_email,
//   stripe_default_payment_method,
//   stripe_created_at
// }
```

Used for storing Stripe customer information in Root policy.

## When to Use Adapters

### ✅ Use Adapters When:

1. **Converting Between Systems**
   ```typescript
   // Converting webhook data to update Root
   const rootPayment = adapter.convertInvoiceToRootPayment(invoice, { ... });
   await rootService.updatePayment(rootPayment);
   ```

2. **Mapping Complex Objects**
   ```typescript
   // Extracting relevant data from Stripe objects
   const metadata = adapter.convertPaymentIntentToMetadata(paymentIntent);
   ```

3. **Applying Business Rules**
   ```typescript
   // Applying transformation rules (e.g., refunds must be negative)
   const refund = adapter.convertChargeToRefund(charge);
   // Returns amount as negative value
   ```

4. **Standardizing Data**
   ```typescript
   // Converting timestamps, currencies, status codes
   const standardized = adapter.convertToStandard(externalData);
   ```

### ❌ Don't Use Adapters For:

1. Simple value assignment (just assign directly)
2. API client methods (put in clients)
3. Business logic (put in services)
4. Data validation (use validation libraries)

## Creating a New Adapter

### Example: Root to Stripe Adapter

```typescript
// adapters/root-to-stripe-adapter.ts
import Stripe from 'stripe';
import * as root from '@rootplatform/node-sdk';

export interface ConvertPolicyParams {
  includeMetadata?: boolean;
}

export default class RootToStripeAdapter {
  /**
   * Convert Root policy to Stripe customer creation parameters
   * 
   * @param policy - Root policy object
   * @param params - Conversion options
   * @returns Stripe customer creation parameters
   */
  convertPolicyToCustomerParams(
    policy: root.Policy,
    params: ConvertPolicyParams = {}
  ): Stripe.CustomerCreateParams {
    return {
      email: policy.policyholder.email,
      name: `${policy.policyholder.first_name} ${policy.policyholder.last_name}`,
      phone: policy.policyholder.cellphone,
      metadata: params.includeMetadata ? {
        root_policy_id: policy.policy_id,
        root_policy_number: policy.policy_number,
      } : undefined,
    };
  }

  /**
   * Convert Root billing amount to Stripe amount (cents)
   */
  convertRootAmountToStripe(amount: number, currency: string): number {
    // Root uses cents, Stripe uses cents - but good to have explicit conversion
    return Math.round(amount);
  }

  /**
   * Convert Root billing frequency to Stripe interval
   */
  convertBillingFrequency(frequency: root.BillingFrequency): Stripe.Price.Recurring.Interval {
    const mapping: Record<root.BillingFrequency, Stripe.Price.Recurring.Interval> = {
      monthly: 'month',
      annually: 'year',
      // Add other mappings as needed
    };

    return mapping[frequency] || 'month';
  }
}
```

### Using Multiple Adapters

```typescript
// In a service
import StripeToRootAdapter from '../adapters/stripe-to-root-adapter';
import RootToStripeAdapter from '../adapters/root-to-stripe-adapter';

export class SyncService {
  constructor(
    private readonly stripeToRoot: StripeToRootAdapter,
    private readonly rootToStripe: RootToStripeAdapter
  ) {}

  async syncPolicyToStripe(policy: root.Policy) {
    // Use Root → Stripe adapter
    const customerParams = this.rootToStripe.convertPolicyToCustomerParams(policy);
    const customer = await stripeClient.customers.create(customerParams);

    // Use Stripe → Root adapter
    const appData = this.stripeToRoot.convertCustomerToAppData(customer);
    await rootClient.SDK.updatePolicy({
      policyId: policy.policy_id,
      body: { app_data: appData },
    });
  }
}
```

## Testing Adapters

Adapters are pure functions and easy to test:

```typescript
import StripeToRootAdapter from '../adapters/stripe-to-root-adapter';
import { PaymentStatus, FailureAction } from '@rootplatform/node-sdk';

describe('StripeToRootAdapter', () => {
  let adapter: StripeToRootAdapter;

  beforeEach(() => {
    adapter = new StripeToRootAdapter();
  });

  describe('convertInvoiceToRootPayment', () => {
    it('should convert paid invoice to successful payment', () => {
      const invoice = {
        id: 'in_123',
        status: 'paid',
        last_finalization_error: null,
      } as any;

      const result = adapter.convertInvoiceToRootPayment(invoice, {
        status: PaymentStatus.Successful,
      });

      expect(result).toEqual({
        status: PaymentStatus.Successful,
        failure_reason: undefined,
        failure_action: FailureAction.BlockRetry,
      });
    });

    it('should include failure reason from invoice error', () => {
      const invoice = {
        id: 'in_123',
        status: 'open',
        last_finalization_error: {
          message: 'Card was declined',
        },
      } as any;

      const result = adapter.convertInvoiceToRootPayment(invoice, {
        status: PaymentStatus.Failed,
      });

      expect(result.failure_reason).toBe('Card was declined');
    });

    it('should use custom failure reason when provided', () => {
      const invoice = { id: 'in_123' } as any;

      const result = adapter.convertInvoiceToRootPayment(invoice, {
        status: PaymentStatus.Failed,
        failureReason: 'Custom reason',
      });

      expect(result.failure_reason).toBe('Custom reason');
    });
  });

  describe('convertCustomerToAppData', () => {
    it('should extract relevant customer data', () => {
      const customer = {
        id: 'cus_123',
        email: 'test@example.com',
        created: 1609459200, // 2021-01-01 00:00:00 UTC
        invoice_settings: {
          default_payment_method: 'pm_123',
        },
      } as any;

      const result = adapter.convertCustomerToAppData(customer);

      expect(result).toEqual({
        stripe_customer_id: 'cus_123',
        stripe_email: 'test@example.com',
        stripe_default_payment_method: 'pm_123',
        stripe_created_at: '2021-01-01T00:00:00.000Z',
      });
    });
  });
});
```

## Best Practices

### Do ✅

- Keep adapters pure (no side effects)
- Make methods static or instance-based (both work)
- Document transformation rules
- Add comprehensive tests
- Handle null/undefined values gracefully
- Use TypeScript for type safety
- Create interfaces for parameters

### Don't ❌

- Make API calls in adapters
- Add business logic (keep it pure transformation)
- Mutate input parameters
- Throw errors (return defaults or undefined)
- Skip null checks
- Create stateful adapters

## Common Transformation Patterns

### Status Mapping

```typescript
mapStatus(externalStatus: string): InternalStatus {
  const mapping = {
    'external_pending': InternalStatus.Pending,
    'external_complete': InternalStatus.Success,
    'external_failed': InternalStatus.Failed,
  };
  
  return mapping[externalStatus] || InternalStatus.Unknown;
}
```

### Date Conversion

```typescript
convertUnixToISO(unixTimestamp: number): string {
  return new Date(unixTimestamp * 1000).toISOString();
}
```

### Amount Transformation

```typescript
convertToMinorUnits(amount: number, currency: string): number {
  // Most currencies use 2 decimal places
  const multiplier = 100;
  return Math.round(amount * multiplier);
}
```

### Field Renaming

```typescript
renameFields(source: SourceObject): DestinationObject {
  return {
    destination_field: source.source_field,
    another_field: source.different_name,
    // Apply transformations while renaming
    created_at: new Date(source.timestamp).toISOString(),
  };
}
```

## Related Documentation

- [Services Documentation](../services/README.md) - Using adapters in services
- [Controllers Documentation](../controllers/README.md) - Data flow
- [Testing Guide](../../docs/TESTING.md) - Testing adapters
- [Best Practices](../../docs/BEST_PRACTICES.md) - Design patterns

