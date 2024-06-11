import rootClient from '../../clients/root-client';
import * as root from '@rootplatform/node-sdk';
import Stripe from 'stripe';
import StripeClient from '../../clients/stripe-client';
import Logger from '../../utils/logger';
import ModuleError from '../../utils/error';

class ProcessCreatePaymentEventController {
  private stripeClient: StripeClient;

  constructor() {
    this.stripeClient = new StripeClient();
  }

  /**
   * Process payment creation event. When a pending payment is created on Root, we create a payment intent on Stripe.
   * NB: PaymentIntents are outside the subscription lifecycle and are not linked to a subscription billing cycle.
   *
   * @param {Object} params - An object containing payment parameters.
   * @param {string} params.rootPaymentId - The root payment ID associated with the payment.
   * @param {string} params.rootPolicyId - The root policy ID linked to the payment.
   * @param {number} params.amount - The payment amount.
   * @param {string} params.description - The description of the payment.
   * @param {string} params.status - The status of the payment.
   * @param {string} params.stripePaymentMethodId - The ID of the Stripe payment method associated with the payment.
   *
   * @throws {Error} Throws an error if the policy ID is not defined or if the policy is missing the Stripe ID in app_data.
   * @returns {Promise<void>} A Promise that resolves after processing the payment event.
   *
   */
  async process(params: {
    rootPaymentId: string;
    rootPolicyId: string;
    amount: number;
    description: string;
    status: root.PaymentStatus;
    stripePaymentMethodId: string;
  }): Promise<void> {
    const { rootPaymentId, rootPolicyId, amount, description, status } = params;

    Logger.debug(`Create Payment Update Action`, {
      rootPaymentId,
      rootPolicyId,
      amount,
      description,
      status,
    });

    if (
      description.includes('Stripe created invoice item:') ||
      description.includes('Refund for Stripe charge:')
    ) {
      Logger.info(
        'Skipping. Not creating a Stripe invoice for payment as it already has an associated invoice.',
        {
          rootPaymentId,
        },
      );
      return;
    }
    if (status !== root.PaymentStatus.Pending) {
      Logger.warn(`Payment ${rootPaymentId} is not pending. Skipping.`);
      return;
    }
    if (!rootPolicyId) {
      throw new ModuleError(`Policy ID not defined`);
    }
    const policy: root.Policy = await rootClient.SDK.getPolicyById({
      policyId: rootPolicyId,
    });
    const policyAppData = policy.app_data;

    if (!policyAppData?.stripe_customer_id) {
      throw new ModuleError(
        `Policy ${policy.policy_id} is missing Stripe Id in app_data`,
      );
    }

    Logger.info(
      `Creating Payment Intent for payment ${rootPaymentId} on policy ${rootPolicyId}`,
    );

    const stripeParams: Stripe.PaymentIntentCreateParams = {
      amount,
      currency: policy.currency,
      customer: policyAppData.stripe_customer_id,
      description,
      metadata: {
        rootPaymentId: rootPaymentId,
        rootPolicyId: policy.policy_id,
      },
      payment_method_types: ['card'],
      confirm: true,
      off_session: true,
    };

    const paymentIntent =
      await this.stripeClient.stripeSDK.paymentIntents.create(stripeParams);

    Logger.info(`Created Payment Intent`, {
      paymentIntent,
    });
  }
}

export default ProcessCreatePaymentEventController;
