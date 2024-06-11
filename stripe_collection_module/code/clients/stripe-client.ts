import Stripe from 'stripe';
import {
  CreatePriceParams,
  CreateSubscriptionScheduleParams,
  PriceIntervals,
  UpdateSubscriptionParams,
} from './stripe-client-types';
import Config from '../config';
import moment from 'moment-timezone';
import ModuleError from '../utils/error';

export default class StripeClient {
  public stripeSDK: Stripe;

  constructor() {
    this.stripeSDK = new Stripe(Config.env.stripeSecretKey);
  }

  createPrice(params: CreatePriceParams): Promise<Stripe.Price> {
    const { stripeProductId, currency, priceAmountInCents, billingFrequency } =
      params;

    const payload: Stripe.PriceCreateParams = {
      product: stripeProductId,
      unit_amount: priceAmountInCents,
      currency,
      recurring: PriceIntervals[billingFrequency] || undefined,
    };

    try {
      return this.stripeSDK.prices.create(payload);
    } catch (error: any) {
      const errorMessage = error.message;
      throw new ModuleError(
        `Unable to create Stripe price for product: ${errorMessage}`,
        {
          stripeProductId,
          currency,
          priceAmountInCents,
          billingFrequency,
          error,
        },
      );
    }
  }

  createSubscriptionSchedule(
    params: CreateSubscriptionScheduleParams,
  ): Promise<Stripe.SubscriptionSchedule> {
    const {
      stripeCustomerId,
      rootPolicyId,
      rootPolicyNumber,
      rootPolicyStartDate,
      rootPolicyEndDate,
      prorationBehavior,
      stripePriceId,
    } = params;

    const phase1End = moment(rootPolicyStartDate).add(1, 'month');

    const subscriptionEndDate = moment(rootPolicyEndDate).unix();

    return this.stripeSDK.subscriptionSchedules.create({
      customer: stripeCustomerId,
      end_behavior: 'cancel',
      start_date: moment(rootPolicyStartDate).unix(),
      phases: [
        // Current month
        {
          end_date: phase1End.unix(),
          items: [
            {
              price: stripePriceId,
            },
          ],
          metadata: {
            rootPolicyId,
            rootPolicyNumber,
          },
          proration_behavior: prorationBehavior,
          billing_cycle_anchor: 'phase_start',
        },
        {
          proration_behavior: prorationBehavior,
          billing_cycle_anchor: 'phase_start',
          end_date: subscriptionEndDate,
          items: [
            {
              price: stripePriceId,
            },
          ],
          metadata: {
            rootPolicyId,
            rootPolicyNumber,
          },
        },
      ],
      metadata: {
        rootPolicyId,
        rootPolicyNumber,
      },
    });
  }

  updateSubscription(
    subscriptionId: string,
    params: UpdateSubscriptionParams,
  ): Promise<Stripe.Subscription> {
    const { subscriptionItemId, stripePriceId, prorationBehavior } = params;

    return this.stripeSDK.subscriptions.update(subscriptionId, {
      items: [
        {
          id: subscriptionItemId,
          price: stripePriceId,
        },
      ],
      proration_behavior:
        prorationBehavior as Stripe.SubscriptionUpdateParams.ProrationBehavior,
    });
  }
}
