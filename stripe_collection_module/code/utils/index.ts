import { StripeEvents } from '../interfaces';
import StripeClient from '../clients/stripe-client';
import moment from 'moment-timezone';
import Config from '../config';
import rootClient from '../clients/root-client';
import Logger from './logger';
import ModuleError from './error';

export function getStripeProductId() {
  return Config.env.stripeProductId;
}

export function convertStripeTimestampToSAST(timestamp: number) {
  // Stripe sends the timestamp in seconds
  // We have to convert to milliseconds to get the right conversion
  // The true parameter in .toISOString keeps the conversion at UTC+2
  const utcTime = moment(timestamp * 1000);
  return utcTime.clone().tz('Africa/Johannesburg').toISOString(true);
}

/**
 * Checks if a policy payment method has a collection module definition associated with it.
 */
export async function isPolicyPaymentMethodLinkedToCollectionModule(
  policyId: string,
) {
  const paymentMethod = await rootClient.SDK.getPolicyPaymentMethod({
    policyId,
  });
  return !!paymentMethod.collection_module_definition_id;
}

export async function getPolicyIdFromStripeEvent(event: any) {
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
      return getPolicyIdFromInvoice(dataObject.id as string);
    }
    case StripeEvents.ChargeRefunded: {
      return getPolicyIdFromInvoice(dataObject.invoice as string);
    }
    case StripeEvents.ChargeDisputeFundsWithdrawn: {
      const charge = await getChargeDetails(dataObject.charge as string);
      return getPolicyIdFromInvoice(charge.invoice as string);
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

/**
 * Get's the policyId from a Stripe invoice
 */
async function getPolicyIdFromInvoice(invoiceId: string) {
  const stripeAPIClient = new StripeClient();
  const invoice = await stripeAPIClient.stripeSDK.invoices.retrieve(invoiceId);
  return invoice.subscription_details?.metadata?.rootPolicyId;
}

/**
 * Get's the charge details using a chargeId
 */
async function getChargeDetails(chargeId: string) {
  const stripeAPIClient = new StripeClient();
  const charge = await stripeAPIClient.stripeSDK.charges.retrieve(chargeId);
  return charge;
}

/**
 * Gets the next occurrence of a target day on or after a reference date
 * @param referenceDate
 * @param targetDay
 * @returns
 */
export const getNextOccurrence = (
  referenceDate: moment.Moment,
  targetDay: number,
) => {
  if (targetDay < 1) {
    throw new ModuleError(
      `Target Day needs to be >= 1 to be valid. TargetDay=${targetDay}`,
    );
  }

  // Find the next occurrence of the target day on or after the reference date
  let nextOccurrence = moment(referenceDate).date(targetDay);

  if (nextOccurrence.isBefore(referenceDate)) {
    nextOccurrence = nextOccurrence.add(1, 'months');
  }

  if (nextOccurrence < referenceDate) {
    throw new ModuleError(`NextOccurrence date needs to be >= ReferenceDate.`, {
      nextOccurrence: nextOccurrence.toISOString(),
      referenceDate: referenceDate.toISOString(),
    });
  }

  return nextOccurrence;
};
