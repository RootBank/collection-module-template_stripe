import { StripeUtils } from '../../utils/stripe-utils';

import * as root from '@rootplatform/node-sdk';
import { getNextOccurrence } from '../../utils';
import moment from 'moment-timezone';
import StripeClient from '../../clients/stripe-client';
import rootClient from '../../clients/root-client';
import Logger from '../../utils/logger';
import ModuleError from '../../utils/error';

class ProcessPolicyUpdatedEventController {
  private stripeUtils: StripeUtils;
  private stripeClient: StripeClient;

  constructor() {
    this.stripeUtils = new StripeUtils();
    this.stripeClient = new StripeClient();
  }

  async process(params: { rootPolicyId: string; updates: any }): Promise<void> {
    const { rootPolicyId, updates } = params;

    Logger.info(`Processing policy updated event`, {
      rootPolicyId,
      updates,
    });

    const policy: root.Policy = await rootClient.SDK.getPolicyById({
      policyId: rootPolicyId,
    });
    const stripeRelatedItems = this.getStripeRelatedItems({
      policy,
      updatePayload: updates,
    });

    if (stripeRelatedItems === null) {
      Logger.info(`Ignoring non-Stripe related policy update event`, {
        rootPolicyId,
        updates,
      });
    } else {
      // Process the event based on the combination of items
      Logger.info(`Processing policy update`, {
        rootPolicyId,
        stripeRelatedItems,
      });

      // Check for different combinations
      if (
        stripeRelatedItems.includes('billing_day') &&
        stripeRelatedItems.length === 1
      ) {
        // Process when only billing day is present
        Logger.debug(`NotImplemented - Processing only billing day`);
        // await this.processBillingDayUpdate(policy);
      } else if (
        stripeRelatedItems.includes('billing_day') &&
        stripeRelatedItems.length > 1
      ) {
        // Process when billing day is present with other items
        Logger.debug(
          `NotImplemented - Processing billing day with other items`,
        );
        // await processBillingDayMixedUpdate({ policy, update });
      } else if (
        !stripeRelatedItems.includes('billing_day') &&
        stripeRelatedItems.length > 0
      ) {
        // Process when other items are present without billing day
        Logger.debug(
          `NotImplemented - Processing other items without billing day`,
        );
        // await processNonBillingDayUpdates({ policy, update });
      }
    }
  }

  /**
   * Processes a billing day update for a policy by updating the associated Stripe subscription schedule.
   *
   * @param {Object} params - Parameters object.
   * @param {Object} params.policy - The policy object containing information about the billing day update.
   *
   * @returns {Promise<void>} - A Promise that resolves when the billing day update process is complete.
   * @throws {Error} - Throws an error if there is an issue during the update process.
   */

  async processBillingDayUpdate(policy: root.Policy): Promise<void> {
    const stripeSubscriptionScheduleId =
      policy.app_data?.stripe_subscription_schedule_id;
    let stripeSubscriptionId = policy.app_data?.stripe_subscription_id;

    let subscriptionSchedule =
      await this.stripeClient.stripeSDK.subscriptionSchedules.retrieve(
        stripeSubscriptionScheduleId as string,
      );

    // if subscription id is  undefined, get the subscription from the subscription schedule
    if (!stripeSubscriptionId) {
      stripeSubscriptionId = subscriptionSchedule.subscription?.toString();

      // update Root policy metadata with the subscription id
      await rootClient.SDK.updatePolicy({
        policyId: policy.policy_id,
        body: {
          app_data: {
            ...policy.app_data,
            stripe_customer_id: policy.app_data?.stripe_customer_id || '',
            stripe_subscription_id: stripeSubscriptionId,
          },
        },
      });
    }

    Logger.info('Fetching stripe schedule and subscription', {
      stripeSubscriptionScheduleId,
      stripeSubscriptionId,
    });

    const subscription =
      await this.stripeClient.stripeSDK.subscriptions.retrieve(
        stripeSubscriptionId as string,
      );

    if (['not_started', 'active'].includes(subscriptionSchedule.status)) {
      // update schedule with phases to change the billing day

      Logger.info(`Update subscription schedule billing day`, {
        stripeSubscriptionScheduleId,
      });

      const priceId = subscription.items.data[0].price.id;
      const referenceDate = moment(policy.start_date).isSameOrAfter(moment())
        ? moment(policy.start_date)
        : moment();

      const rootBillingDay = getNextOccurrence(
        referenceDate,
        policy.billing_day || 0,
      );

      Logger.debug(
        `Billing Day - ${moment(
          rootBillingDay,
        ).unix()} policy billing frequency ${policy.billing_frequency}`,
      );

      const stripeProductId = this.stripeUtils.getStripeProductId();
      let premiumAmountInCents = String(policy.monthly_premium);

      if (policy.billing_frequency === 'monthly') {
        premiumAmountInCents = String(parseInt(premiumAmountInCents, 10));
      } else if (policy.billing_frequency === 'yearly') {
        premiumAmountInCents = String(parseInt(premiumAmountInCents, 10) * 12);
      }

      let stripeBillingFrequency: 'month' | 'year';
      if (policy.billing_frequency === 'monthly') {
        stripeBillingFrequency = 'month';
      } else if (policy.billing_frequency === 'yearly') {
        stripeBillingFrequency = 'year';
      } else {
        throw new ModuleError(
          `Unable to create Stripe price with an invalid policy billing frequency`,
          {
            stripeProductId,
            billingFrequency: policy.billing_frequency,
          },
        );
      }

      let newPriceObject;
      try {
        newPriceObject = await this.stripeClient.stripeSDK.prices.create({
          product: stripeProductId,
          unit_amount: parseInt(premiumAmountInCents, 10),
          currency: policy.currency,
          recurring: { interval: stripeBillingFrequency },
        });
      } catch (error: any) {
        const errorMessage = error.message;
        throw new ModuleError(
          `Unable to create Stripe price for product: ${errorMessage}`,
          {
            stripeProductId,
          },
        );
      }

      const subscriptionScheduleEndDate = moment(policy.end_date).unix();

      // This is custom logic - Client want the billing to go off 7 days before
      let nextPhaseStart = rootBillingDay.unix();

      if (nextPhaseStart < moment().unix()) {
        // We can't update the subscription schedule to a date in the past, so start next month
        nextPhaseStart = rootBillingDay.add(1, 'month').unix();
      }

      await this.stripeClient.stripeSDK.subscriptionSchedules.update(
        stripeSubscriptionScheduleId as string,
        {
          end_behavior: 'cancel',
          phases: [
            // current subscription phase
            {
              items: [
                {
                  price: priceId,
                },
              ],
              start_date: subscription.start_date,
              end_date: nextPhaseStart,
            },
            // new subscription phase
            {
              start_date: nextPhaseStart,
              end_date: subscriptionScheduleEndDate,
              items: [{ price: newPriceObject.id }],
              billing_cycle_anchor: 'phase_start', // this updates the billing date on Stripe
            },
          ],
        },
      );

      Logger.info(`Update complete - ${rootBillingDay.unix()}`);
    } else {
      Logger.info(
        `Skipping update for schedule with status ${subscriptionSchedule.status}`,
      );

      subscriptionSchedule =
        await this.stripeClient.stripeSDK.subscriptionSchedules.create(
          stripeSubscriptionId,
        );
    }
  }

  /**
   * Checks if a policy update is related to Stripe based on the presence of specific keys in the update payload.
   * @param {Object} params - Parameters object.
   * @param {Object} params.policy - The policy object containing app data.
   * @param {Object} params.updatePayload - The payload received in the policy update event.
   *
   * @returns {Array|null} - Array of strings indicating which items are present, or null if not related to Stripe.
   */
  getStripeRelatedItems({
    policy,
    updatePayload,
  }: {
    policy: root.Policy;
    updatePayload: any;
  }) {
    Logger.info(`Running stripe related items`, {
      policy,
      updatePayload,
    });

    const policyAppData = policy.app_data;

    if (
      !policyAppData ||
      !(
        policyAppData.stripe_subscription_schedule_id ||
        policyAppData.stripe_subscription_id
      )
    ) {
      Logger.warn(
        `policy_updated event skipped due to missing Stripe Schedule or Subscription in the app data`,
      );
      return null;
    }

    const stripeRelatedKeys = [
      'start_date',
      'end_date',
      'monthly_premium',
      'billing_day',
    ];

    Logger.info(`Checking present items: ${policy.policy_id}`);

    const presentItems = stripeRelatedKeys.filter((key) =>
      Object.prototype.hasOwnProperty.call(updatePayload, key),
    );

    Logger.info(`Running stripe related items`, {
      presentItems,
    });
    return presentItems.length > 0 ? presentItems : null;
  }
}

export { ProcessPolicyUpdatedEventController };
