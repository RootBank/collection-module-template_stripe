import * as root from '@rootplatform/node-sdk';
import StripeToRootAdapter from '../../adapters/stripe-to-root-adapter';
import Stripe from 'stripe';

import { convertStripeTimestampToSAST } from '../../utils';
import StripeClient from '../../clients/stripe-client';
import rootClient from '../../clients/root-client';
import Logger from '../../utils/logger';
import ModuleError from '../../utils/error';

export default class ProcessInvoiceCreatedEventController {
  stripeToRootAdapter: StripeToRootAdapter;
  stripeClient: StripeClient;

  constructor() {
    this.stripeToRootAdapter = new StripeToRootAdapter();
    this.stripeClient = new StripeClient();
  }

  async process(invoice: Stripe.Invoice) {
    Logger.info(`Processing Stripe invoice event to create payments on Root`);

    if (invoice.metadata && invoice.metadata.createdBy === 'manual') {
      Logger.info(
        `Skipping. Not creating payments on Root as the payments associated with invoice ${invoice.id} have already been created manually`,
        {
          invoice,
        },
      );
      return;
    }

    if (!(invoice.id && invoice.subscription)) {
      throw new ModuleError(
        `Stripe invoice ${invoice.id} is missing the associated subscription.`,
        {
          invoice,
        },
      );
    }

    const subscription =
      await this.stripeClient.stripeSDK.subscriptions.retrieve(
        invoice.subscription as string,
      );
    const subscriptionMetadata = subscription.metadata;

    if (!subscriptionMetadata.rootPolicyId) {
      throw new ModuleError(
        `Stripe subscription ${subscription.id} metadata is missing Root policy id`,
        {
          subscription,
        },
      );
    }
    const rootPaymentMethod = await rootClient.SDK.getPolicyPaymentMethod({
      policyId: subscriptionMetadata.rootPolicyId,
    });

    if (!rootPaymentMethod.payment_method_id) {
      throw new ModuleError(
        `Failed to retrieve the payment method id for the policy : ${subscriptionMetadata.rootPolicyId} associated with invoice ${invoice.id}`,
        {
          subscriptionMetadata,
          invoice,
        },
      );
    }
    const { rootPolicyId } = subscriptionMetadata;

    const associatedRootPayments = [];
    if (!invoice.amount_due) {
      throw new ModuleError(
        `Stripe invoice ${invoice.id} is missing the amount due.`,
        {
          invoice,
        },
      );
    }
    try {
      Logger.info(
        `Creating Root payments for Stripe invoice ${invoice.id} for policy ${rootPolicyId}`,
        {
          invoice,
        },
      );

      for (const item of invoice.lines.data) {
        const rootPayment: root.PaymentCreate = {
          status:
            invoice.amount_due === 0
              ? root.PaymentStatus.Successful
              : root.PaymentStatus.Pending,
          amount: item.amount,
          description: `Stripe created invoice item: ${
            item.description ?? item.id
          }`,
          payment_date: convertStripeTimestampToSAST(invoice.created),
          finalized_at:
            invoice.amount_due === 0
              ? convertStripeTimestampToSAST(invoice.created)
              : undefined,
          external_reference: item.id,
          payment_method_id: rootPaymentMethod.payment_method_id,
          premium_type:
            item.amount < 0 ? undefined : root.PremiumType.Recurring,
          payment_type:
            item.amount < 0
              ? root.PaymentType.PremiumRefund
              : root.PaymentType.Premium,
          collection_type: root.CollectionType.CollectionModule,
        };

        const response = await rootClient.SDK.createPolicyPayment({
          policyId: rootPolicyId,
          paymentCreate: rootPayment,
        });

        if (!response.payment_id) {
          throw new ModuleError(`Payment id is missing from the response`, {
            response,
          });
        }

        associatedRootPayments.push({
          invoiceLineItemId: item.id,
          rootPaymentId: response.payment_id,
        });

        const metadata = {
          associatedRootPaymentIds: JSON.stringify(associatedRootPayments),
          rootPolicyId,
        };

        await this.stripeClient.stripeSDK.invoices.update(invoice.id, {
          metadata,
        });
      }

      Logger.info(
        `Successfully created Root payments for Stripe invoice ${invoice.id} for policy ${rootPolicyId}`,
        {
          invoice,
        },
      );
    } catch (error: any) {
      const errorMessage = error.message;

      throw new ModuleError(
        `Failed to create Root payments for Stripe invoice ${invoice.id} for policy ${rootPolicyId} ${errorMessage}`,
        {
          invoice,
        },
      );
    }
  }
}
