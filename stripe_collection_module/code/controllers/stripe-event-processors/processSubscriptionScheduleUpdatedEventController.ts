import * as root from '@rootplatform/node-sdk';
import Stripe from 'stripe';
import StripeClient from '../../clients/stripe-client';
import rootClient from '../../clients/root-client';
import ModuleError from '../../utils/error';
import Logger from '../../utils/logger';

class ProcessSubscriptionScheduleUpdatedEventController {
  private stripeClient: StripeClient;

  constructor() {
    this.stripeClient = new StripeClient();
  }

  /**
   * Update the policy with subscription id
   *
   * @param {string} rootPolicyId - Root policy id
   *
   */
  async process(stripeSubscriptionSchedule: Stripe.SubscriptionSchedule) {
    const rootPolicyId = stripeSubscriptionSchedule.metadata?.rootPolicyId;

    Logger.info('Updating app data for policy', {
      rootPolicyId,
    });

    if (!rootPolicyId) {
      throw new ModuleError(
        'Root Policy is missing from Stripe subscription schedule',
        {
          stripeSubscriptionSchedule,
        },
      );
    }
    // For now, we can ignore updates to the schedule when it is not "active"
    if (!['active'].includes(stripeSubscriptionSchedule.status)) {
      return;
    }

    const rootPolicy = await rootClient.SDK.getPolicyById({
      policyId: rootPolicyId,
    });
    const policyAppData = rootPolicy.app_data;

    if (!stripeSubscriptionSchedule.subscription) {
      throw new ModuleError(
        `Stripe subscription schedule ${stripeSubscriptionSchedule.id} is missing a subscription id`,
        {
          stripeSubscriptionSchedule,
        },
      );
    }

    await rootClient.SDK.updatePolicy({
      policyId: rootPolicyId,
      body: {
        app_data: {
          ...policyAppData,
          stripe_customer_id: policyAppData?.stripe_customer_id || '',
          stripe_subscription_schedule_id: stripeSubscriptionSchedule.id,
          stripe_subscription_id: stripeSubscriptionSchedule.subscription,
        },
      },
    });

    Logger.info(
      `Updated Root policy with Stripe subscription schedule ID: ${stripeSubscriptionSchedule.id}`,
      {
        rootPolicyId,
        stripeSubscriptionSchedule,
      },
    );

    // Update the payment method assigned to the subscription
    const existingPaymentMethods =
      await rootClient.SDK.getPolicyholderPaymentMethods({
        policyholderId: rootPolicy.policyholder_id,
      });

    const stripeSubscription =
      await this.stripeClient.stripeSDK.subscriptions.retrieve(
        stripeSubscriptionSchedule.subscription as string,
      );

    Logger.info(
      `Subscription Updated | Stripe subscription retrieved: ${JSON.stringify(
        stripeSubscription,
      )}`,
    );

    // Check if any existing payment method has the same payment_method
    const matchingPaymentMethod = existingPaymentMethods.find(
      (paymentMethod) => {
        // log the payment method module object and the stripe subscription schedule default payment method
        Logger.info(
          `comparing payment method module and stripe subscription schedule default payment method`,
          {
            paymentMethod,
            stripeSubscription,
          },
        );

        const module = (paymentMethod as any).module;
        return (
          stripeSubscription.default_payment_method &&
          module! &&
          module!.payment_method === stripeSubscription.default_payment_method
        );
      },
    );

    if (matchingPaymentMethod) {
      // The stripe_payment_method_id already exists in one of the payment methods
      const rootPaymentMethodId = matchingPaymentMethod.payment_method_id;
      Logger.info(
        `Found matching payment method. Assigning the Payment Method ID: ${rootPaymentMethodId} to the policy : ${rootPolicyId}`,
      );

      if (!rootPaymentMethodId) {
        throw new ModuleError(
          `Root payment method is missing the Stripe payment method ID in the module data for policy`,
          {
            rootPolicy,
          },
        );
      }

      // Now you can use paymentMethodId to call the assignPaymentMethod function
      await rootClient.SDK.assignPolicyPaymentMethod({
        policyId: rootPolicyId,
        body: {
          payment_method_id: rootPaymentMethodId,
        },
      });
    } else if (stripeSubscription.default_payment_method) {
      Logger.info(
        `No payment method match found. Assigning the Stripe Payment Method ID: ${
          stripeSubscription.default_payment_method as string
        } to the policy : ${rootPolicyId}`,
        {
          rootPolicy,
          stripeSubscription,
        },
      );

      const newPaymentMethod =
        await rootClient.SDK.createPolicyholderPaymentMethod({
          policyholderId: rootPolicy.policyholder_id,
          body: {
            type: root.CollectionType.CollectionModule,
            policy_ids: rootPolicyId,
          },
        });

      await rootClient.SDK.assignPolicyPaymentMethod({
        policyId: rootPolicyId,
        body: {
          payment_method_id: newPaymentMethod.payment_method_id,
        },
      });

      Logger.info(
        `Successfully created new payment method for policy : ${rootPolicyId}`,
        {
          rootPolicy,
          newPaymentMethod,
        },
      );
    }
  }
}

export default ProcessSubscriptionScheduleUpdatedEventController;
