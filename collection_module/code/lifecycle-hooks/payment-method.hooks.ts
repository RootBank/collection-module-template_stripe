/**
 * Payment Method Lifecycle Hooks
 *
 * Handles payment method creation, viewing, and assignment
 */

import { getContainer } from '../core/container.setup';
import { ServiceToken } from '../core/container';
import { LogService } from '../services/log.service';
import { RenderService } from '../services/render.service';
import { ConfigurationService } from '../services/config.service';
import StripeClient from '../clients/stripe-client';

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
  const container = getContainer();
  const logService = container.resolve<LogService>(ServiceToken.LOG_SERVICE);

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
  const container = getContainer();
  const logService = container.resolve<LogService>(ServiceToken.LOG_SERVICE);
  const renderService = container.resolve<RenderService>(
    ServiceToken.RENDER_SERVICE
  );
  const configService = container.resolve<ConfigurationService>(
    ServiceToken.CONFIG_SERVICE
  );
  const stripeClient = container.resolve<StripeClient>(
    ServiceToken.PROVIDER_CLIENT
  );

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
    return renderService.renderCreatePaymentMethod({
      stripePublishableKey: configService.get('providerPublishableKey'),
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
  const container = getContainer();
  const logService = container.resolve<LogService>(ServiceToken.LOG_SERVICE);
  const renderService = container.resolve<RenderService>(
    ServiceToken.RENDER_SERVICE
  );
  const stripeClient = container.resolve<StripeClient>(
    ServiceToken.PROVIDER_CLIENT
  );

  logService.info(
    'Rendering payment method summary',
    'renderViewPaymentMethodSummary'
  );

  try {
    const { payment_method: paymentMethod } = params;

    if (!paymentMethod) {
      return '<div>No payment method found</div>';
    }

    // Retrieve payment method from Stripe
    const stripePaymentMethod =
      await stripeClient.stripeSDK.paymentMethods.retrieve(
        paymentMethod as string
      );

    return renderService.renderViewPaymentMethodSummary({
      payment_method: {
        module: {
          payment_method: stripePaymentMethod.id,
        },
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
 * Render detailed payment method view
 *
 * TODO: Implement full payment method details view
 */
export function renderViewPaymentMethod(): string {
  // Stub - will be implemented when needed
  return '';
}

/**
 * Called after a payment method is assigned to a policy
 *
 * TODO: Implement payment method assignment logic
 */
export function afterPolicyPaymentMethodAssigned({
  policy,
}: {
  policy: any;
}): void {
  const container = getContainer();
  const logService = container.resolve<LogService>(ServiceToken.LOG_SERVICE);

  logService.info(
    'Payment method assigned to policy',
    'afterPolicyPaymentMethodAssigned',
    { policyId: policy.policy_id }
  );

  // Stub - implement your logic here
}

/**
 * Called after a payment method is removed from a policy
 *
 * TODO: Implement payment method removal logic
 */
export function afterPaymentMethodRemoved({ policy }: { policy: any }): void {
  const container = getContainer();
  const logService = container.resolve<LogService>(ServiceToken.LOG_SERVICE);

  logService.info(
    'Payment method removed from policy',
    'afterPaymentMethodRemoved',
    { policyId: policy.policy_id }
  );

  // Stub - implement your logic here
}
