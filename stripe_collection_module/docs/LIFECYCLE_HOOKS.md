# Lifecycle Hooks

This directory contains lifecycle hook functions that are called by the Root Platform at various points in the policy and payment lifecycle.

Lifecycle hooks are callback functions invoked by Root Platform when events occur:
- Policy issued
- Payment method assigned
- Payment created
- Policy updated
- Policy cancelled
- And more...

## Architecture

```
Root Platform Event → Lifecycle Hook → Your Logic → External Systems
     (trigger)         (callback)    (implement)    (Stripe, etc.)
```

## Available Hooks

### Payment Method Lifecycle

#### renderCreatePaymentMethod()

Renders HTML form for creating a payment method.

**Trigger**: User clicks "Add Payment Method" in Root dashboard

**Returns**: HTML string with Stripe Elements form

```typescript
export async function renderCreatePaymentMethod(): Promise<string> {
  // 1. Create Stripe setup intent
  const setupIntent = await stripeClient.stripeSDK.setupIntents.create({});

  // 2. Render form with Stripe Elements
  return renderService.renderCreatePaymentMethod({
    stripePublishableKey: config.get('stripePublishableKey'),
    setupIntentClientSecret: setupIntent.client_secret,
  });
}
```

#### createPaymentMethod()

Creates payment method data structure after form submission.

**Trigger**: After user submits payment method form

**Parameters**: `{ data: { setupIntent } }`

**Returns**: `{ module: PaymentMethodData }`

```typescript
export function createPaymentMethod({ data }): { module: any } {
  return {
    module: {
      id: data.setupIntent.id,
      usage: data.setupIntent.usage,
      payment_method: data.setupIntent.payment_method,
      status: data.setupIntent.status,
    },
  };
}
```

#### renderViewPaymentMethod()

Renders detailed view of payment method.

**Trigger**: Viewing payment method details in dashboard

```typescript
export function renderViewPaymentMethod(params): string {
  return renderService.renderViewPaymentMethod({
    payment_method: params.payment_method,
    policy: params.policy,
  });
}
```

#### renderViewPaymentMethodSummary()

Renders compact payment method summary.

**Trigger**: Listing payment methods

```typescript
export async function renderViewPaymentMethodSummary(params): Promise<string> {
  // Fetch payment method details from Stripe
  const paymentMethodDetails = await stripeClient.stripeSDK.paymentMethods.retrieve(
    params.payment_method.module.payment_method
  );

  return renderService.renderViewPaymentMethodSummary({
    payment_method: params.payment_method,
    paymentMethodDetails: { card: paymentMethodDetails.card },
  });
}
```

### Policy Lifecycle

#### afterPolicyIssued()

Called after a policy is issued.

**Trigger**: New policy created

**Parameters**: `{ policy }`

**Implementation Example**:

```typescript
export async function afterPolicyIssued({ policy }): Promise<void> {
  const logService = getLogService();
  logService.info('Policy issued', 'afterPolicyIssued', {
    policyId: policy.policy_id,
  });

  // Example: Create Stripe customer for the policy
  const customer = await stripeClient.stripeSDK.customers.create({
    email: policy.policyholder.email,
    name: `${policy.policyholder.first_name} ${policy.policyholder.last_name}`,
    metadata: {
      root_policy_id: policy.policy_id,
    },
  });

  // Store customer ID in policy
  await rootClient.SDK.updatePolicy({
    policyId: policy.policy_id,
    body: {
      app_data: {
        stripe_customer_id: customer.id,
      },
    },
  });
}
```

#### afterPolicyPaymentMethodAssigned()

Called when a payment method is assigned to a policy.

**Trigger**: Payment method linked to policy

**Parameters**: `{ policy }`

**Implementation Example**:

```typescript
export async function afterPolicyPaymentMethodAssigned({ policy }): Promise<void> {
  const logService = getLogService();
  logService.info('Payment method assigned', 'afterPolicyPaymentMethodAssigned', {
    policyId: policy.policy_id,
  });

  // 1. Get payment method from Root
  const paymentMethod = await rootClient.SDK.getPolicyPaymentMethod({
    policyId: policy.policy_id,
  });
  const stripePaymentMethodId = paymentMethod.module.payment_method;

  // 2. Get or create Stripe customer
  let customerId = policy.app_data?.stripe_customer_id;
  if (!customerId) {
    const customer = await stripeClient.stripeSDK.customers.create({
      email: policy.policyholder.email,
      metadata: { root_policy_id: policy.policy_id },
    });
    customerId = customer.id;
  }

  // 3. Attach payment method to customer
  await stripeClient.stripeSDK.paymentMethods.attach(stripePaymentMethodId, {
    customer: customerId,
  });

  // 4. Set as default payment method
  await stripeClient.stripeSDK.customers.update(customerId, {
    invoice_settings: {
      default_payment_method: stripePaymentMethodId,
    },
  });

  // 5. Update policy with Stripe data
  await rootClient.SDK.updatePolicy({
    policyId: policy.policy_id,
    body: {
      app_data: {
        stripe_customer_id: customerId,
        stripe_payment_method_id: stripePaymentMethodId,
      },
    },
  });
}
```

#### afterPaymentMethodRemoved()

Called when payment method is removed from policy.

**Trigger**: Payment method unlinked

**Parameters**: `{ policy }`

#### afterPolicyUpdated()

Called when policy is updated.

**Trigger**: Policy fields modified

**Parameters**: `{ policy, updates }`

**Implementation Example**:

```typescript
export async function afterPolicyUpdated({ policy, updates }): Promise<void> {
  // Check if billing amount changed
  if (updates.billing_amount) {
    const customerId = policy.app_data?.stripe_customer_id;
    const subscriptionId = policy.app_data?.stripe_subscription_id;

    if (subscriptionId) {
      // Update subscription price
      await updateStripeSubscriptionPrice(
        subscriptionId,
        policy.billing_amount
      );
    }
  }
}
```

#### afterPolicyCancelled()

Called when policy is cancelled.

**Trigger**: Policy cancellation

**Parameters**: `{ policy }`

**Implementation Example**:

```typescript
export async function afterPolicyCancelled({ policy }): Promise<void> {
  const subscriptionId = policy.app_data?.stripe_subscription_id;
  
  if (subscriptionId) {
    // Cancel Stripe subscription
    await stripeClient.stripeSDK.subscriptions.cancel(subscriptionId);
  }
}
```

#### afterPolicyExpired()

Called when policy expires.

**Trigger**: Policy expiration date passes

**Parameters**: `{ policy }`

#### afterPolicyLapsed()

Called when policy lapses.

**Trigger**: Policy goes into lapse

**Parameters**: `{ policy }`

### Payment Lifecycle

#### afterPaymentCreated()

Called when a payment is created.

**Trigger**: New payment created on Root

**Parameters**: `{ policy, payment }`

**Implementation Example**:

```typescript
export async function afterPaymentCreated({ policy, payment }): Promise<void> {
  const logService = getLogService();
  logService.info('Payment created', 'afterPaymentCreated', {
    policyId: policy.policy_id,
    paymentId: payment.payment_id,
  });

  // Get customer ID
  const customerId = policy.app_data?.stripe_customer_id;
  if (!customerId) {
    throw new Error('Policy missing Stripe customer ID');
  }

  // Create payment intent on Stripe
  const paymentIntent = await stripeClient.stripeSDK.paymentIntents.create({
    amount: payment.amount,
    currency: policy.currency,
    customer: customerId,
    description: payment.description,
    metadata: {
      root_payment_id: payment.payment_id,
      root_policy_id: policy.policy_id,
    },
    confirm: true,
    off_session: true,
  });

  logService.info('Payment intent created', 'afterPaymentCreated', {
    paymentIntentId: paymentIntent.id,
  });
}
```

#### afterPaymentUpdated()

Called when payment is updated.

**Trigger**: Payment fields modified

**Parameters**: `{ policy, payment }`

### Alteration Lifecycle

#### afterAlterationPackageApplied()

Called after alteration package is applied.

**Trigger**: Policy alteration processed

**Parameters**: `{ policy, alteration_package, alteration_hook_key }`

**Implementation Example**:

```typescript
export async function afterAlterationPackageApplied({
  policy,
  alteration_package,
  alteration_hook_key,
}): Promise<void> {
  // Check if billing amount changed
  if (alteration_package.changes.billing_amount) {
    // Update Stripe subscription
    await updateStripeSubscription(policy, alteration_package.changes);
  }
}
```

## Hook Implementation Pattern

### Basic Structure

```typescript
export async function hookName(params: HookParams): Promise<ReturnType> {
  const logService = getLogService();
  
  try {
    // 1. Log entry
    logService.info('Hook started', 'HookName', params);

    // 2. Validate inputs
    if (!params.policy) {
      throw new Error('Policy is required');
    }

    // 3. Perform operations
    const result = await performOperation(params);

    // 4. Log success
    logService.info('Hook completed', 'HookName', { result });

    return result;
  } catch (error: any) {
    // 5. Log error
    logService.error('Hook failed', 'HookName', params, error);
    throw error;
  }
}
```

### Using Services in Hooks

```typescript
import { getLogService } from '../services/log-instance';
import { RootService } from '../services/root.service';
import StripeClient from '../clients/stripe-client';

export async function afterPolicyPaymentMethodAssigned({ policy }) {
  const logService = getLogService();
  const rootService = new RootService(logService);
  const stripeClient = new StripeClient();

  // Use services for business logic
  const paymentMethod = await rootClient.SDK.getPolicyPaymentMethod({
    policyId: policy.policy_id,
  });
  const customer = await stripeClient.stripeSDK.customers.create({ ... });
  
  await rootClient.SDK.updatePolicy({
    policyId: policy.policy_id,
    body: {
      app_data: {
        stripe_customer_id: customer.id,
      },
    },
  });
}
```

## Testing Lifecycle Hooks

Lifecycle hooks can be tested like any other function:

```typescript
import { afterPolicyPaymentMethodAssigned } from '../lifecycle-hooks';
import { getLogService } from '../services/log-instance';

jest.mock('../services/log-instance');
jest.mock('../clients/stripe-client');
jest.mock('../services/root.service');

describe('afterPolicyPaymentMethodAssigned', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should assign payment method to Stripe customer', async () => {
    const policy = {
      policy_id: 'policy_123',
      app_data: { stripe_customer_id: 'cus_123' },
    };

    await afterPolicyPaymentMethodAssigned({ policy });

    expect(mockStripeClient.paymentMethods.attach).toHaveBeenCalledWith(
      'pm_123',
      { customer: 'cus_123' }
    );
  });
});
```

## Best Practices

### Do ✅

- Log hook entry and exit
- Validate input parameters
- Handle errors gracefully
- Use services for business logic
- Keep hooks thin (orchestration only)
- Add error context
- Test with mocked dependencies

### Don't ❌

- Put complex business logic in hooks
- Ignore errors
- Skip logging
- Make hooks stateful
- Hard-code configuration
- Skip input validation
- Create direct SDK calls (use clients)

## Common Patterns

### Idempotency

```typescript
export async function afterPaymentCreated({ policy, payment }) {
  // Check if already processed
  const existingPaymentIntent = payment.metadata?.stripe_payment_intent_id;
  if (existingPaymentIntent) {
    logService.info('Payment already processed', 'afterPaymentCreated');
    return;
  }

  // Process payment
  const paymentIntent = await createPaymentIntent(payment);
  
  // Store reference to prevent re-processing
  await updatePaymentMetadata(payment.payment_id, {
    stripe_payment_intent_id: paymentIntent.id,
  });
}
```

### Error Recovery

```typescript
export async function afterPolicyPaymentMethodAssigned({ policy }) {
  try {
    await assignPaymentMethod(policy);
  } catch (error: any) {
    logService.error('Failed to assign payment method', 'Hook', {}, error);
    
    // Don't throw - allow policy to continue
    // Root Platform will retry later
    return;
  }
}
```

## Related Documentation

- [Controllers Documentation](../controllers/README.md) - Similar patterns
- [Services Documentation](../services/README.md) - Business logic layer
- [Root Platform Docs](https://docs.root.co.za) - Official lifecycle hooks documentation
- [Webhooks](../../docs/WEBHOOKS.md) - Webhook vs lifecycle hooks

