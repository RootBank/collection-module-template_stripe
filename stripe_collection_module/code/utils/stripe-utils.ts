import 'moment-timezone';
import Stripe from 'stripe';

import { StripeEvents } from '../interfaces/stripe-events';
import moment from 'moment-timezone';
import Config from '../config';
import StripeClient from '../clients/stripe-client';
import rootClient from '../clients/root-client';
import Logger from './logger';
import ModuleError from './error';

class StripeUtils {
  private stripeClient: StripeClient;

  constructor() {
    this.stripeClient = new StripeClient();
  }

  async getSuccessfulInvoiceCharges(params: { stripeCustomerId: string }) {
    const { stripeCustomerId } = params;
    const charges = await this.stripeClient.stripeSDK.charges.list({
      customer: stripeCustomerId,
      limit: 3,
    });
    const chargesToRefund = charges.data.filter(
      (charge) =>
        ['succeeded'].includes(charge.status) &&
        !charge.refunded &&
        !!charge.invoice,
    );
    return chargesToRefund;
  }

  async refundCharges(params: { charges: any[] }) {
    const { charges } = params;
    for (const charge of charges) {
      await this.stripeClient.stripeSDK.refunds.create({
        charge: charge.id.toString(),
        reason: 'requested_by_customer',
      });

      Logger.debug(`Charge refunded`, {
        charge,
      });
    }
  }

  convertStripeTimestampToSAST = (timestamp: number) => {
    const utcTime = moment(timestamp * 1000);
    return utcTime.clone().tz('Africa/Johannesburg').toISOString(true);
  };

  async cancelStripeScheduleAndSubscription(params: {
    rootPolicyId: string;
    policyAppData: any;
    prorate: boolean;
    invoice_now: boolean;
  }) {
    const { rootPolicyId, policyAppData, prorate, invoice_now } = params;

    Logger.info(
      `Start cancelling Stripe schedule & subscription for policy ${rootPolicyId}`,
    );

    try {
      const stripeSubscriptionScheduleId =
        policyAppData.stripe_subscription_schedule_id;
      const stripeSubscriptionId = policyAppData.stripe_subscription_id;

      if (stripeSubscriptionScheduleId) {
        const subscriptionSchedule =
          await this.stripeClient.stripeSDK.subscriptionSchedules.retrieve(
            stripeSubscriptionScheduleId as string,
          );

        const subscriptionId =
          stripeSubscriptionId || subscriptionSchedule.subscription;

        if (['not_started', 'active'].includes(subscriptionSchedule.status)) {
          await this.stripeClient.stripeSDK.subscriptionSchedules.cancel(
            stripeSubscriptionScheduleId as string,
            {
              invoice_now,
              prorate,
            },
          );
        }

        if (subscriptionId) {
          const subscription =
            await this.stripeClient.stripeSDK.subscriptions.retrieve(
              subscriptionId as string,
            );

          if (subscription.status !== 'canceled') {
            await this.stripeClient.stripeSDK.subscriptions.cancel(
              subscriptionId as string,
              {
                prorate,
                invoice_now,
              },
            );
          }
        }
      }
    } catch (error: any) {
      throw new ModuleError(
        `There was an error cancelling the Stripe schedule or subscription for policy ${rootPolicyId}: ${error.message}`,
        {
          rootPolicyId,
          error,
        },
      );
    }
  }

  getStripeProductId() {
    return Config.env.stripeProductId;
  }

  async getPolicyIdFromStripeEvent(event: any) {
    const { type } = event;

    Logger.info(`Check for policyId in event type ${type}`, {
      event,
    });

    const dataObject = event.data.object;

    switch (type) {
      case StripeEvents.InvoiceCreated: {
        const rootPolicyId =
          dataObject?.metadata?.rootPolicyId ||
          dataObject?.subscription_details?.metadata?.rootPolicyId;
        return rootPolicyId;
      }
      case StripeEvents.InvoicePaid:
      case StripeEvents.InvoicePaymentFailed:
      case StripeEvents.InvoiceVoided:
      case StripeEvents.InvoiceMarkedUncollectible: {
        return this.getPolicyIdFromInvoice(dataObject.id as string);
      }
      case StripeEvents.ChargeRefunded: {
        return this.getPolicyIdFromInvoice(dataObject.invoice as string);
      }
      case StripeEvents.ChargeDisputeFundsWithdrawn: {
        const charge: Stripe.Charge = await this.getChargeDetails(
          dataObject.charge as string,
        );
        if (typeof charge.invoice === 'string') {
          return this.getPolicyIdFromInvoice(charge.invoice);
        }
      }
      case StripeEvents.SubscriptionScheduleUpdated: {
        return dataObject?.metadata?.rootPolicyId;
      }
      case StripeEvents.PaymentIntentSucceeded:
      case StripeEvents.PaymentIntentFailed: {
        return dataObject?.metadata?.rootPolicyId;
      }
      default:
        return undefined;
    }
  }

  async isPolicyPaymentMethodLinkedToCollectionModule(policyId: string) {
    const paymentMethod = await rootClient.SDK.getPolicyPaymentMethod({
      policyId,
    });
    return !!paymentMethod.collection_module_definition_id;
  }

  async getPolicyIdFromInvoice(invoiceId: string) {
    const invoice = await this.stripeClient.stripeSDK.invoices.retrieve(
      invoiceId,
    );
    return invoice.subscription_details?.metadata?.rootPolicyId;
  }

  async getPolicyIdFromPaymentIntent({
    paymentIntentId,
  }: {
    paymentIntentId: string;
  }) {
    const paymentIntent =
      await this.stripeClient.stripeSDK.paymentIntents.retrieve(
        paymentIntentId,
      );
    return paymentIntent.metadata.rootPolicyId;
  }

  async getChargeDetails(chargeId: string) {
    const charge = await this.stripeClient.stripeSDK.charges.retrieve(chargeId);
    return charge;
  }
}

export { StripeUtils };
