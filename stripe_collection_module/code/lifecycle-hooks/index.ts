/**
 * Lifecycle Hooks
 *
 * These are called by the Root platform at various points in the policy lifecycle.
 * This is a simplified stub implementation with clear extension points.
 *
 * Full implementation will be added when the Stripe/Root integration is built.
 */

import { RenderService } from '../services/render.service';
import { getLogService } from '../services/log-instance';
import { getConfigService } from '../services/config-instance';
import StripeClient from '../clients/stripe-client';

const renderService = new RenderService();
const stripeClient = new StripeClient();

/**
 * Called after a policy is issued
 *
 * TODO: Implement policy issued logic
 */
export function afterPolicyIssued(): void {
  // Stub implementation
}

/**
 * Create payment method - returns module data structure
 *
 * This is called when a setup intent is completed.
 */
export function createPaymentMethod({
  data,
}: {
  data?: { setupIntent?: any };
}): { module: any } {
  const logService = getLogService();
  logService.info('Creating payment method', 'createPaymentMethod', data);

  if (data?.setupIntent) {
    return {
      module: {
        id: data.setupIntent.id,
        usage: data.setupIntent.usage,
        object: data.setupIntent.object,
        status: data.setupIntent.status,
        livemode: data.setupIntent.livemode,
        payment_method: data.setupIntent.payment_method,
      },
    };
  }

  return {
    module: data,
  };
}

/**
 * Render payment method creation form
 *
 * Returns HTML form with Stripe Elements for capturing payment details.
 */
export async function renderCreatePaymentMethod(): Promise<string> {
  const logService = getLogService();
  logService.info(
    'Rendering payment method creation form',
    'renderCreatePaymentMethod'
  );

  try {
    // Create Stripe setup intent
    const setupIntent = await stripeClient.stripeSDK.setupIntents.create({});

    if (!setupIntent.client_secret) {
      throw new Error('Setup intent client secret is missing');
    }

    // Render form using RenderService
    const config = getConfigService();
    return renderService.renderCreatePaymentMethod({
      stripePublishableKey: config.get('stripePublishableKey'),
      setupIntentClientSecret: setupIntent.client_secret,
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    logService.error(
      'Error rendering payment method form',
      'renderCreatePaymentMethod',
      {},
      error as Error
    );
    throw new Error(`Error creating setup intent: ${errorMessage}`);
  }
}

/**
 * Render payment method summary view (compact card)
 *
 * Returns HTML showing a brief summary of the payment method.
 */
export async function renderViewPaymentMethodSummary(params: {
  payment_method: any;
}): Promise<string> {
  const logService = getLogService();
  logService.info(
    'Rendering payment method summary',
    'renderViewPaymentMethodSummary'
  );

  try {
    const { payment_method: paymentMethod } = params;

    // Get payment method details from Stripe
    const paymentMethodDetails =
      await stripeClient.stripeSDK.paymentMethods.retrieve(
        paymentMethod?.module?.payment_method as string
      );

    return renderService.renderViewPaymentMethodSummary({
      payment_method: paymentMethod,
      paymentMethodDetails: {
        card: paymentMethodDetails.card,
      },
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    logService.error(
      'Error rendering payment method summary',
      'renderViewPaymentMethodSummary',
      {},
      error as Error
    );
    throw new Error(`Error retrieving payment method: ${errorMessage}`);
  }
}

/**
 * Render full payment method details view
 *
 * Returns HTML showing comprehensive payment method information.
 */
export function renderViewPaymentMethod(params: any): string {
  const logService = getLogService();
  logService.info(
    'Rendering payment method details',
    'renderViewPaymentMethod'
  );

  const { payment_method: paymentMethod, policy } = params;

  return renderService.renderViewPaymentMethod({
    payment_method: paymentMethod,
    policy,
  });
}

/**
 * Called after payment method is assigned to a policy
 *
 * TODO: Implement full payment method assignment workflow:
 * - Get or create Stripe customer
 * - Attach payment method to customer
 * - Create or update subscription
 */
export function afterPolicyPaymentMethodAssigned({
  policy,
}: {
  policy: any;
}): void {
  const logService = getLogService();
  logService.info(
    'Payment method assigned to policy',
    'afterPolicyPaymentMethodAssigned',
    {
      policyId: policy.policy_id,
    }
  );

  // TODO: Implement payment method assignment logic
  // This will use PaymentMethodService to orchestrate the workflow
}

/**
 * Called after a payment is created
 *
 * TODO: Implement payment creation handling:
 * - Create Stripe payment intent
 * - Link to Root payment
 */
export function afterPaymentCreated({
  policy,
  payment,
}: {
  policy: any;
  payment: any;
}): void {
  const logService = getLogService();
  logService.info('Payment created', 'afterPaymentCreated', {
    policyId: policy.policy_id,
    paymentId: payment.payment_id,
  });

  // TODO: Implement payment creation logic
}

/**
 * Called after a payment is updated
 *
 * TODO: Implement payment update handling
 */
export function afterPaymentUpdated({
  policy,
  payment,
}: {
  policy: any;
  payment: any;
}): void {
  const logService = getLogService();
  logService.info('Payment updated', 'afterPaymentUpdated', {
    policyId: policy.policy_id,
    paymentId: payment.payment_id,
  });

  // TODO: Implement payment update logic
}

/**
 * Called after payment method is removed from policy
 *
 * TODO: Implement payment method removal:
 * - Cancel subscriptions
 * - Clean up Stripe resources
 */
export function afterPaymentMethodRemoved({ policy }: { policy: any }): void {
  const logService = getLogService();
  logService.info('Payment method removed', 'afterPaymentMethodRemoved', {
    policyId: policy.policy_id,
  });

  // TODO: Implement payment method removal logic
}

/**
 * Called after policy is cancelled
 *
 * TODO: Implement policy cancellation:
 * - Cancel Stripe subscriptions
 * - Handle refunds if needed
 */
export function afterPolicyCancelled({ policy }: { policy: any }): void {
  const logService = getLogService();
  logService.info('Policy cancelled', 'afterPolicyCancelled', {
    policyId: policy.policy_id,
  });

  // TODO: Implement policy cancellation logic
}

/**
 * Called after policy expires
 *
 * TODO: Implement policy expiration handling
 */
export function afterPolicyExpired({ policy }: { policy: any }): void {
  const logService = getLogService();
  logService.info('Policy expired', 'afterPolicyExpired', {
    policyId: policy.policy_id,
  });

  // TODO: Implement policy expiration logic
}

/**
 * Called after policy lapses
 *
 * TODO: Implement policy lapse handling
 */
export function afterPolicyLapsed({ policy }: { policy: any }): void {
  const logService = getLogService();
  logService.info('Policy lapsed', 'afterPolicyLapsed', {
    policyId: policy.policy_id,
  });

  // TODO: Implement policy lapse logic
}

/**
 * Called after policy is updated
 *
 * TODO: Implement policy update handling:
 * - Update subscription amounts
 * - Handle proration
 */
export function afterPolicyUpdated({
  policy,
  updates,
}: {
  policy: any;
  updates: any;
}): void {
  const logService = getLogService();
  logService.info('Policy updated', 'afterPolicyUpdated', {
    policyId: policy.policy_id,
    updates,
  });

  // TODO: Implement policy update logic
}

/**
 * Called after alteration package is applied
 *
 * TODO: Implement alteration handling:
 * - Update subscription pricing
 * - Handle billing frequency changes
 */
export function afterAlterationPackageApplied({
  policy,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  alteration_package,
  alteration_hook_key,
}: {
  policy: any;
  alteration_package: any;
  alteration_hook_key: string;
}): void {
  const logService = getLogService();
  logService.info(
    'Alteration package applied',
    'afterAlterationPackageApplied',
    {
      policyId: policy.policy_id,
      alterationHookKey: alteration_hook_key,
    }
  );

  // TODO: Implement alteration logic
}
