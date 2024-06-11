import * as root from '@rootplatform/node-sdk';
import Stripe from 'stripe';
import rootClient from '../../clients/root-client';
import Logger from '../../utils/logger';
import ModuleError from '../../utils/error';

class ProcessPaymentIntentFailedEventController {
  /**
   * This updates the payment linked to a payment intent to failed.
   *
   * @param {object} paymentIntent - Incoming paymentIntent from Stripe
   *
   */
  async process({ paymentIntent }: { paymentIntent: Stripe.PaymentIntent }) {
    Logger.info(
      `Processing Stripe payment_intent.payment_failed event to update payments on Root`,
      {
        paymentIntent,
      },
    );

    if (!paymentIntent.metadata.rootPaymentId) {
      throw new ModuleError(
        `No rootPaymentId found in the metadata of paymentIntent ${paymentIntent.id}.`,
        {
          paymentIntent,
        },
      );
    }

    Logger.info(
      `Updating Root payment to Failed for paymentIntentId ${paymentIntent.id}`,
    );

    await rootClient.SDK.updatePaymentsAsync({
      paymentUpdates: [
        {
          payment_id: paymentIntent.metadata.rootPaymentId,
          status: root.PaymentStatus.Failed,
          failure_reason:
            paymentIntent.last_payment_error?.message ||
            'Stripe payment failed to collect',
          failure_action: root.FailureAction.AllowRetry,
        },
      ],
    });

    Logger.info(
      `Payment linked to the paymentIntent ${paymentIntent.id} has been updated to Failed.`,
    );
  }
}

export default ProcessPaymentIntentFailedEventController;
