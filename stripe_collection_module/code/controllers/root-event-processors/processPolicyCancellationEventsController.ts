import * as root from '@rootplatform/node-sdk';
import { StripeUtils } from '../../utils/stripe-utils';
import { getNextOccurrence } from '../../utils';
import StripeClient from '../../clients/stripe-client';
import moment from 'moment-timezone';
import rootClient from '../../clients/root-client';
import Logger from '../../utils/logger';
import ModuleError from '../../utils/error';

class ProcessPolicyCancellationEventsController {
  stripeUtils: StripeUtils;
  stripeClient: StripeClient;

  constructor() {
    this.stripeUtils = new StripeUtils();
    this.stripeClient = new StripeClient();
  }

  async process(rootPolicyId: string, event: string): Promise<void> {
    Logger.info(`Canceling Stripe subscription`, {
      rootPolicyId,
      event,
    });

    const COOLING_OFF_PERIOD_DAYS = 14;
    const policy: root.Policy = await rootClient.SDK.getPolicyById({
      policyId: rootPolicyId,
    });

    if (!policy.app_data) {
      throw new ModuleError(`Policy contains no app_data: ${rootPolicyId}`, {
        policy,
      });
    }
    const policyAppData = policy.app_data;

    // check if stripe metadata exists on the policy
    this.validatePolicyAppData(policyAppData);

    // check if refunds are due because of cooling off period
    const withinCoolingOffPeriod =
      getNextOccurrence(
        moment(policy.start_date),
        COOLING_OFF_PERIOD_DAYS,
      ).toDate() <= new Date();

    if (withinCoolingOffPeriod) {
      await this.createCoolingOffPeriodRefunds({
        stripeCustomerId: policyAppData.stripe_customer_id,
      });
    }

    // check if pro-ration is needed
    let shouldProrate = false;
    shouldProrate = this.shouldProrateCancellation({
      billingFrequency: policy.billing_frequency,
      claimedAgainst: !!policy.module.claimed_against,
      withinCoolingOffPeriod,
    });

    const subscriptionSchedule =
      await this.stripeClient.stripeSDK.subscriptionSchedules.retrieve(
        policy.app_data.stripe_subscription_schedule_id as string,
      );

    // check if the associated subscription is cancellable
    const stripeSubscriptionId =
      policy.app_data.stripe_subscription_id ||
      subscriptionSchedule.subscription;

    if (stripeSubscriptionId) {
      const subscription =
        await this.stripeClient.stripeSDK.subscriptions.retrieve(
          stripeSubscriptionId as string,
        );

      if (subscription.status !== 'canceled') {
        Logger.info('Cancelling subscription', {
          stripeSubscriptionId,
        });

        // Cancel the subscription
        await this.stripeClient.stripeSDK.subscriptions.cancel(
          stripeSubscriptionId as string,
          {
            prorate: shouldProrate,
            invoice_now: shouldProrate,
          },
        );
      }
    }

    if (
      subscriptionSchedule.status === 'active' ||
      subscriptionSchedule.status === 'not_started'
    ) {
      Logger.info('Cancelling subscription schedule', {
        subscriptionSchedule,
      });

      await this.stripeClient.stripeSDK.subscriptionSchedules.cancel(
        policy.app_data.stripe_subscription_schedule_id as string,
        {
          prorate: shouldProrate,
          invoice_now: shouldProrate,
        },
      );
    }

    const newAppData = {
      ...policyAppData,
      stripe_customer_id: policyAppData.stripe_customer_id?.toString() || '',
      stripe_subscription_id: undefined,
      stripe_subscription_schedule_id: undefined,
    };

    Logger.debug('New app data', {
      newAppData,
    });

    await rootClient.SDK.updatePolicy({
      policyId: rootPolicyId,
      body: {
        app_data: newAppData,
      },
    });
  }

  validatePolicyAppData(policyAppData: any): void {
    const hasSubscriptionInfo =
      policyAppData?.stripe_subscription_schedule_id ||
      policyAppData?.stripe_subscription_id;
    const hasCustomerId = policyAppData?.stripe_customer_id;

    if (!hasSubscriptionInfo) {
      throw new ModuleError(
        'Unable to cancel policy because of missing Stripe Schedule or Subscription in the app data',
        {
          policyAppData,
        },
      );
    }

    if (!hasCustomerId) {
      throw new ModuleError(
        `Unable to cancel policy because of missing Stripe Customer in the app data`,
        {
          policyAppData,
        },
      );
    }
  }

  async createCoolingOffPeriodRefunds({
    stripeCustomerId,
  }: {
    stripeCustomerId: string;
  }): Promise<void> {
    const charges = await this.stripeUtils.getSuccessfulInvoiceCharges({
      stripeCustomerId,
    });

    await this.stripeUtils.refundCharges({ charges });
  }

  shouldProrateCancellation({
    billingFrequency,
    claimedAgainst,
    withinCoolingOffPeriod,
  }: {
    billingFrequency: string;
    claimedAgainst: boolean;
    withinCoolingOffPeriod: boolean;
  }): boolean {
    return !!(
      ['yearly'].includes(billingFrequency) &&
      claimedAgainst === false &&
      withinCoolingOffPeriod === false
    );
  }

  async isSubscriptionCancellable({
    stripeSubscriptionId,
  }: {
    stripeSubscriptionId: string;
  }): Promise<boolean> {
    const stripeSubscription =
      await this.stripeClient.stripeSDK.subscriptions.retrieve(
        stripeSubscriptionId,
      );

    if (stripeSubscription.status === 'active') {
      return true;
    } else {
      Logger.warn(
        `The subscription ${stripeSubscriptionId} is not active, so it will not be cancelled.`,
        {
          stripeSubscription,
        },
      );
      return false;
    }
  }
}

export default ProcessPolicyCancellationEventsController;
