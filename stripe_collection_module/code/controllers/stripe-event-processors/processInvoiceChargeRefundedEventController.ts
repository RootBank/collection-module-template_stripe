import * as root from '@rootplatform/node-sdk';
import Stripe from 'stripe';
import { StripeUtils } from '../../utils/stripe-utils';
import StripeToRootAdapter from '../../adapters/stripe-to-root-adapter';
import StripeClient from '../../clients/stripe-client';
import rootClient from '../../clients/root-client';
import ModuleError from '../../utils/error';
import Logger from '../../utils/logger';

class ProcessInvoiceChargeRefundedEventController {
  private stripeUtils: StripeUtils;
  private stripeToRootAdapter: StripeToRootAdapter;
  private stripeClient: StripeClient;

  constructor() {
    this.stripeToRootAdapter = new StripeToRootAdapter();
    this.stripeUtils = new StripeUtils();
    this.stripeClient = new StripeClient();
  }

  async process(charge: Stripe.Charge) {
    Logger.info(`Processing Stripe charge refund event ${charge.id}`);

    if (!charge.invoice) {
      throw new ModuleError(`Charge ${charge.id} has no associated Invoice`, {
        charge,
      });
    }

    const invoiceAssociatedWithCharge =
      await this.stripeClient.stripeSDK.invoices.retrieve(
        charge.invoice as string,
      );

    if (
      !(
        invoiceAssociatedWithCharge.metadata &&
        invoiceAssociatedWithCharge.metadata.rootPolicyId
      )
    ) {
      throw new ModuleError(
        `Invoice ${invoiceAssociatedWithCharge.id} is missing policy Id in its metadata`,
        {
          invoiceAssociatedWithCharge,
        },
      );
    }

    const rootPaymentMethod = await rootClient.SDK.getPolicyPaymentMethod({
      policyId: invoiceAssociatedWithCharge.metadata.rootPolicyId,
    });

    if (!rootPaymentMethod.payment_method_id) {
      throw new ModuleError(
        `Failed to retrieve the payment method id for the policy : ${invoiceAssociatedWithCharge.metadata.rootPolicyId} associated with invoice ${invoiceAssociatedWithCharge.id}`,
        {
          invoiceAssociatedWithCharge,
        },
      );
    }

    const { rootPolicyId } = invoiceAssociatedWithCharge.metadata;
    const rootPayment =
      this.stripeToRootAdapter.convertChargeRefundToRootPayment({
        paymentStatus: root.PaymentStatus.Successful,
        amount: charge.amount_refunded,
        description: `Stripe created invoice item: Refund for Stripe charge: ${charge.id}`,
        paymentDate: this.stripeUtils.convertStripeTimestampToSAST(
          charge.created,
        ),
        externalReference: charge.id,
        finalizedAt: this.stripeUtils.convertStripeTimestampToSAST(
          charge.created,
        ),
        paymentMethodId: rootPaymentMethod.payment_method_id,
      });

    try {
      await rootClient.SDK.createPolicyPayment({
        policyId: rootPolicyId,
        paymentCreate: {
          ...rootPayment,
          collection_type: root.CollectionType.CollectionModule,
          payment_type: root.PaymentType.Reversal,
        },
      });
    } catch (error: any) {
      throw new ModuleError(
        `Failed to create refund payment for Stripe charge: ${error.message}`,
        {
          charge,
          rootPolicyId,
          error,
        },
      );
    }
  }
}

export default ProcessInvoiceChargeRefundedEventController;
