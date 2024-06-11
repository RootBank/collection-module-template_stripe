import * as root from '@rootplatform/node-sdk';
import Stripe from 'stripe';
import { PaymentStatus } from '@rootplatform/node-sdk';
import StripeClient from '../../clients/stripe-client';
import rootClient from '../../clients/root-client';
import Logger from '../../utils/logger';
import ModuleError from '../../utils/error';

class ProcessChargeDisputedEventController {
  private stripeClient: StripeClient;

  constructor() {
    this.stripeClient = new StripeClient();
  }

  async process(dispute: Stripe.Dispute) {
    Logger.info(`Reverse Root payment for dispute: ${dispute.id}`);

    if (!(dispute.id && dispute.charge)) {
      throw new ModuleError(
        `Stripe dispute ${dispute.id} is missing dispute id or charge id`,
        {
          dispute,
        },
      );
    }

    const charge = await this.stripeClient.stripeSDK.charges.retrieve(
      dispute.charge as string,
    );

    if (!charge.invoice) {
      throw new ModuleError(`Stripe charge ${charge.id} is missing invoice`, {
        charge,
      });
    }

    const invoice = await this.stripeClient.stripeSDK.invoices.retrieve(
      charge.invoice as string,
    );
    const invoiceMetadata = invoice.metadata;

    if (
      !(
        invoiceMetadata &&
        invoiceMetadata.rootPolicyId &&
        invoiceMetadata.rootPaymentId
      )
    ) {
      throw new ModuleError(
        `Stripe invoice ${invoice.id} metadata is missing Root policy id & payment id`,
        {
          invoice,
        },
      );
    }

    const { rootPolicyId } = invoiceMetadata;
    const { rootPaymentId } = invoiceMetadata;

    Logger.info(`** Reversing Root payment for policy:`, {
      rootPolicyId,
      rootPaymentId,
    });

    try {
      await rootClient.SDK.updatePaymentsAsync({
        paymentUpdates: [
          {
            payment_id: rootPaymentId,
            status: PaymentStatus.Failed,
            failure_reason: dispute.reason || 'Stripe payment disputed.',
            failure_action: root.FailureAction.BlockPaymentMethod,
          },
        ],
      });
    } catch (error: any) {
      throw new ModuleError(`Failed to update Root payment: ${error.message}`, {
        rootPaymentId,
        error,
      });
    }
  }
}

export default ProcessChargeDisputedEventController;
