import * as root from '@rootplatform/node-sdk';
import Stripe from 'stripe';
import { StripeUtils } from '../../utils/stripe-utils';
import StripeClient from '../../clients/stripe-client';
import { CreatePriceParams } from '../../clients/stripe-client-types';
import rootClient from '../../clients/root-client';
import Logger from '../../utils/logger';
import ModuleError from '../../utils/error';

class ProcessPolicyPaymentMethodAssignedEventController {
  private stripeUtils: StripeUtils;
  private stripeClient: StripeClient;

  constructor() {
    this.stripeUtils = new StripeUtils();
    this.stripeClient = new StripeClient();
  }

  async process({ policy }: { policy: root.Policy }) {
    Logger.info(`updating PaymentMethod`, {
      policy,
    });

    const rootPaymentMethod: root.PaymentMethod =
      await rootClient.SDK.getPolicyPaymentMethod({
        policyId: policy.policy_id,
      });

    const module = (rootPaymentMethod as any).module;
    if (!module.payment_method) {
      throw new ModuleError(
        `Root payment method is missing the Stripe payment method ID in the module data for policy`,
        {
          policy,
        },
      );
    }

    // get Stripe payment method
    const stripePaymentMethod: Stripe.PaymentMethod =
      await this.stripeClient.stripeSDK.paymentMethods.retrieve(
        module.payment_method as string,
      );

    Logger.debug('retrieved payment method', {
      stripePaymentMethod,
    });

    Logger.debug(
      `checking if there is linked customer for policy ${policy.policy_id}`,
    );

    policy.app_data = policy.app_data || {};

    const stripeCustomerId = await this.getOrCreateStripeCustomer(
      policy,
      stripePaymentMethod,
    );

    const { stripeSubscription, stripeSubscriptionSchedule } =
      await this.getOrCreateStripeSubscription(policy, stripeCustomerId);

    Logger.debug(
      `retrieved stripe subscription and stripe subscription schedule`,
      {
        stripeSubscription,
        stripeSubscriptionSchedule,
      },
    );

    await this.linkPaymentMethodToCustomer(
      policy,
      stripePaymentMethod,
      stripeCustomerId,
      stripeSubscription,
      stripeSubscriptionSchedule,
    );

    Logger.info(`done`, {
      stripePaymentMethod,
    });
  }

  async getOrCreateStripeCustomer(
    policy: root.Policy,
    stripePaymentMethod: Stripe.PaymentMethod,
  ): Promise<string> {
    if (policy.app_data?.stripe_customer_id) {
      Logger.info(
        'Stripe customer already exists for policy ${policy.policy_id}',
      );

      return policy.app_data.stripe_customer_id;
    }

    Logger.debug(
      `No stripe customer assigned to policy yet : ${policy.policy_id}`,
    );

    // There is no linked stripe customer - create one
    const policyHolder = await rootClient.SDK.getPolicyholderById({
      policyholderId: policy.policyholder_id,
    });

    const stripeCustomer = await this.stripeClient.stripeSDK.customers.create({
      name: `${policyHolder.first_name} ${policyHolder.last_name}`,
      description: `Customer linked to Root policy : ${policy.policy_id}`,
      payment_method: stripePaymentMethod.id,
      invoice_settings: { default_payment_method: stripePaymentMethod.id },
      metadata: {
        rootPolicyId: policy.policy_id,
        rootPolicyHolderId: policyHolder.policyholder_id,
      },
    });

    Logger.info('Stripe customer created', {
      stripeCustomer,
    });

    return stripeCustomer.id;
  }

  async getOrCreateStripeSubscription(
    policy: root.Policy,
    stripeCustomerId: string,
  ): Promise<{
    stripeSubscriptionSchedule?: Stripe.SubscriptionSchedule;
    stripeSubscription?: Stripe.Subscription;
  }> {
    let stripeSubscription: Stripe.Subscription | undefined;
    let stripeSubscriptionSchedule: Stripe.SubscriptionSchedule | undefined;

    // Fetch the subscription schedule if it exists
    if (policy.app_data?.stripe_subscription_schedule_id) {
      Logger.info(
        `Policy has linked subscription schedule: ${policy.policy_id}, retrieving subscription schedule`,
      );

      stripeSubscriptionSchedule =
        await this.stripeClient.stripeSDK.subscriptionSchedules.retrieve(
          policy.app_data.stripe_subscription_schedule_id as string,
        );
    }

    // Fetch the subscription if it exists
    if (
      policy.app_data?.stripe_subscription_id ||
      stripeSubscriptionSchedule?.subscription
    ) {
      Logger.info(
        `Policy has linked subscription: ${policy.policy_id}, retrieving subscription`,
      );

      const subscriptionId =
        policy.app_data?.stripe_subscription_id ||
        (stripeSubscriptionSchedule?.subscription as string);

      stripeSubscription =
        await this.stripeClient.stripeSDK.subscriptions.retrieve(
          subscriptionId as string,
        );
    }

    // Check if we have a subscription or subscription schedule - if not create one
    if (!stripeSubscription && !stripeSubscriptionSchedule) {
      Logger.info(
        'Policy has NO linked subscription or subscription schedule',
        {
          policy,
        },
      );

      const stripeProductId = this.stripeUtils.getStripeProductId();

      let premiumAmountInCents = policy.monthly_premium;

      if (policy.billing_frequency === 'yearly') {
        premiumAmountInCents *= 12;
      }

      const newPriceObject = await this.stripeClient.createPrice({
        currency: policy.currency,
        priceAmountInCents: premiumAmountInCents,
        billingFrequency:
          policy.billing_frequency as CreatePriceParams['billingFrequency'],
        stripeProductId,
      });

      stripeSubscriptionSchedule =
        await this.stripeClient.createSubscriptionSchedule({
          stripeCustomerId: stripeCustomerId,
          rootPolicyId: policy.policy_id,
          rootPolicyNumber: policy.policy_number,
          rootPolicyStartDate: policy.start_date,
          rootPolicyEndDate: policy.end_date,
          billingFrequency:
            policy.billing_frequency as CreatePriceParams['billingFrequency'],
          stripePriceId: newPriceObject.id,
          prorationBehavior: 'none',
        });

      Logger.info('Created subscription schedule', {
        stripeSubscriptionSchedule,
      });

      Logger.info(
        'Attaching stripe metadata to policy for subscription schedule',
        {
          stripeSubscriptionSchedule,
        },
      );

      await rootClient.SDK.updatePolicy({
        policyId: policy.policy_id,
        body: {
          app_data: {
            ...policy.app_data,
            stripeSubscriptionScheduleId: stripeSubscriptionSchedule.id,
            stripeSubscriptionId: stripeSubscriptionSchedule.subscription,
            stripeCustomerId: stripeCustomerId,
          },
        },
      });
    }

    return {
      stripeSubscription,
      stripeSubscriptionSchedule,
    };
  }

  async linkPaymentMethodToCustomer(
    policy: root.Policy,
    stripePaymentMethod: Stripe.PaymentMethod,
    stripeCustomerId: string,
    stripeSubscription: Stripe.Subscription | undefined,
    stripeSubscriptionSchedule: Stripe.SubscriptionSchedule | undefined,
  ) {
    if (!stripeSubscription && !stripeSubscriptionSchedule) {
      throw new ModuleError(
        `No subscription or subscription schedule found for policy ${policy.policy_id}. Cannot link payment method to customer.`,
        {
          policy,
        },
      );
    }

    if (stripeSubscription) {
      if (
        stripeSubscription.default_payment_method === stripePaymentMethod.id
      ) {
        Logger.debug(
          `payment method ${stripePaymentMethod.id} is already linked to the subscription ${stripeSubscription.id} for policy ${policy.policy_id} - skipping linking step`,
        );
        return;
      }

      await this.stripeClient.stripeSDK.customers.update(stripeCustomerId, {
        invoice_settings: {
          default_payment_method: stripePaymentMethod.id.toString(),
        },
      });

      return;
    }

    // Link the payment to the customer
    Logger.info(
      'subscription schedule has no linked subscription - linking payment method to customer',
    );

    await this.stripeClient.stripeSDK.paymentMethods.attach(
      stripePaymentMethod.id,
      {
        customer: stripeCustomerId,
      },
    );

    await this.stripeClient.stripeSDK.customers.update(stripeCustomerId, {
      invoice_settings: {
        default_payment_method: stripePaymentMethod.id.toString(),
      },
    });
  }
}

export default ProcessPolicyPaymentMethodAssignedEventController;
