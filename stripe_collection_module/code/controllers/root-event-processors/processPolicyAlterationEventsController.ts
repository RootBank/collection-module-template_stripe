import * as root from '@rootplatform/node-sdk';
import { StripeUtils } from '../../utils/stripe-utils';
import StripeClient from '../../clients/stripe-client';
import moment from 'moment-timezone';
import { getNextOccurrence } from '../../utils';
import rootClient from '../../clients/root-client';
import Logger from '../../utils/logger';
import ModuleError from '../../utils/error';

interface ProcessParams {
  rootPolicyId: string;
  updatedMonthlyPremiumAmount: number;
  currency: string;
  billingFrequency: 'monthly' | 'yearly' | 'once_off';
  rootPolicyStartDate: string;
  rootPolicyEndDate: string;
  billingDay: number | null;
  policyAppData: any;
  alterationHookKey: string;
  alterationPackage: any;
}

interface ProcessUpdateBillingFrequencyHookParams {
  stripeCustomerId: string;
  rootPolicyId: string;
  updatedMonthlyPremiumAmount: number;
  currency: string;
  billingFrequency: 'monthly' | 'yearly' | 'once_off';
  rootPolicyStartDate: string;
  rootPolicyEndDate: string;
  billingDay: number | null;
  policyAppData: any;
  stripeProductId: string;
}

class ProcessPolicyAlterationEventsController {
  private stripeUtils: StripeUtils;
  private stripeClient: StripeClient;

  constructor() {
    this.stripeUtils = new StripeUtils();
    this.stripeClient = new StripeClient();
  }

  async process(params: ProcessParams) {
    const {
      rootPolicyId,
      updatedMonthlyPremiumAmount,
      currency,
      billingFrequency,
      rootPolicyStartDate,
      rootPolicyEndDate,
      billingDay,
      policyAppData,
      alterationHookKey,
      alterationPackage,
    } = params;

    const stripeProductId = this.stripeUtils.getStripeProductId();

    Logger.info('updating Stripe subscription', {
      rootPolicyId,
      stripeProductId,
      alterationHookKey,
      alterationPackage,
    });

    const stripeCustomerId = policyAppData.stripe_customer_id;
    const UPDATE_BILLING_FREQUENCY_HOOK_KEY = 'update_billing_frequency';
    const COLLECT_OUTSTANDING_PREMIUM_KEY = 'collect_outstanding_premium';
    const COLLECT_ADHOC_PAYMENT_KEY = 'collect_adhoc_payment';
    const RENEW_POLICY_HOOK_KEY = 'renew_policy';
    const UPDATE_POLICY_COVER = 'update_policy_cover';

    Logger.info(`processing alteration hook`, {
      alterationHookKey,
    });

    switch (alterationHookKey) {
      case UPDATE_BILLING_FREQUENCY_HOOK_KEY:
      case COLLECT_OUTSTANDING_PREMIUM_KEY: {
        if (billingFrequency !== 'yearly') {
          // we only want to collect outstanding premium for policies whose post-alteration billing frequency is yearly
          throw new ModuleError(
            'Attempting to run alteration hook on policy with non permitted billing frequency',
            {
              alterationHookKey,
              rootPolicyId,
              billingFrequency,
            },
          );
        }

        await this.processUpdateBillingFrequencyHook({
          stripeCustomerId,
          rootPolicyId,
          updatedMonthlyPremiumAmount,
          currency,
          billingFrequency,
          rootPolicyStartDate,
          rootPolicyEndDate,
          billingDay,
          policyAppData,
          stripeProductId,
        });

        break;
      }
      case RENEW_POLICY_HOOK_KEY: {
        await this.processRenewPolicyHook({
          stripeCustomerId,
          rootPolicyId,
          updatedMonthlyPremiumAmount,
          currency,
          billingFrequency,
          rootPolicyEndDate,
          billingDay,
          policyAppData,
          stripeProductId,
        });

        break;
      }
      case COLLECT_ADHOC_PAYMENT_KEY: {
        await this.processCollectAdhocPaymentHook({
          rootPolicyId,
          paymentAmount: alterationPackage.input_data.payment_amount,
          paymentType: alterationPackage.input_data.payment_type,
          description: alterationPackage.input_data.description,
        });

        break;
      }
      case UPDATE_POLICY_COVER:
      default: {
        await this.processNonSpecificHook({
          stripeCustomerId,
          rootPolicyId,
          updatedMonthlyPremiumAmount,
          currency,
          billingFrequency,
          rootPolicyStartDate,
          rootPolicyEndDate,
          policyAppData,
          stripeProductId,
        });
        break;
      }
    }
  }

  /**
   * Handles the update process when alterationHookKey is "update_billing_frequency". Credits paid invoices,
   * cancels the existing subscription and schedule, backdates the subscription,
   * and switches to a yearly billing frequency.
   *
   * @param {Object} params - Parameters for the update process.
   * @param {string} params.stripeCustomerId - Stripe customer ID.
   * @param {string} params.rootPolicyId - Root policy ID.
   * @param {number} params.updatedPremiumAmount - Updated premium amount.
   * @param {string} params.currency - Currency.
   * @param {string} params.billingFrequency - Billing frequency.
   * @param {string} params.rootPolicyStartDate - Start date of the root policy.
   * @param {string} params.rootPolicyEndDate - End date of the root policy.
   * @param {Object} params.policyAppData - Policy application data.
   * @param {string} params.stripeProductId - Stripe product ID.
   */
  async processUpdateBillingFrequencyHook(
    params: ProcessUpdateBillingFrequencyHookParams,
  ) {
    const {
      stripeCustomerId,
      rootPolicyId,
      updatedMonthlyPremiumAmount,
      currency,
      billingFrequency,
      rootPolicyStartDate,
      rootPolicyEndDate,
      billingDay,
      policyAppData,
      stripeProductId,
    } = params;

    // get the subscription id
    let stripeSubscriptionId = policyAppData.stripe_subscription_id;

    if (!stripeSubscriptionId) {
      const stripeSubscriptionSchedule =
        await this.stripeClient.stripeSDK.subscriptionSchedules.retrieve(
          policyAppData.stripe_subscription_schedule_id as string,
        );
      stripeSubscriptionId = stripeSubscriptionSchedule.subscription;
    }

    if (!stripeSubscriptionId) {
      throw new ModuleError(
        `Attempting to update billing frequency for policy with no attached subscription`,
        {
          rootPolicyId,
        },
      );
    }

    Logger.info('back dating subscription and switching to yearly', {
      rootPolicyId,
      stripeSubscriptionId,
    });

    // cancel the existing subscription and schedule for the customer
    const shouldProrate = false;
    await this.stripeUtils.cancelStripeScheduleAndSubscription({
      rootPolicyId,
      policyAppData,
      prorate: shouldProrate,
      invoice_now: shouldProrate,
    });

    // detach subscription and schedule ids from the policy
    await rootClient.SDK.updatePolicy({
      policyId: rootPolicyId,
      body: {
        app_data: {
          ...policyAppData,
          stripe_subscription_id: undefined,
          stripe_subscription_schedule_id: undefined,
          stripe_customer_id: stripeCustomerId,
        },
      },
    });

    // create the new backdated subscription schedule
    const monthsLeftOnSubscription = this.getMonthsLeftOnSubscription({
      rootPolicyEndDate,
      billingDay,
    });

    const outstandingPremiumAmount =
      monthsLeftOnSubscription * updatedMonthlyPremiumAmount;

    Logger.info('outstanding premium amount', {
      outstandingPremiumAmount,
      monthsLeftOnSubscription,
      updatedMonthlyPremiumAmount,
    });

    const policy = await rootClient.SDK.getPolicyById({
      policyId: rootPolicyId,
    });

    Logger.info('creating subscription schedule subscription', {
      params,
    });

    const stripePriceObject = await this.stripeClient.createPrice({
      stripeProductId,
      currency,
      priceAmountInCents: updatedMonthlyPremiumAmount,
      billingFrequency,
    });

    const stripeSubscriptionSchedule =
      await this.stripeClient.createSubscriptionSchedule({
        stripeCustomerId,
        rootPolicyId,
        rootPolicyNumber: policy.policy_number,
        rootPolicyStartDate,
        rootPolicyEndDate,
        billingFrequency,
        stripePriceId: stripePriceObject.id,
        prorationBehavior: 'none',
      });

    await rootClient.SDK.updatePolicy({
      policyId: rootPolicyId,
      body: {
        app_data: {
          ...policyAppData,
          stripe_subscription_schedule_id: stripeSubscriptionSchedule.id,
          stripe_subscription_id: stripeSubscriptionSchedule.subscription,
          stripe_customer_id: stripeCustomerId,
        },
      },
    });
  }

  /**
   * Handles the renewal process when alterationHookKey is "renewal_policy". Creates a new subscription schedule,
   * after the previous one expires.
   *
   * @param {Object} params - Parameters for the update process.
   * @param {string} params.stripeCustomerId - Stripe customer ID.
   * @param {string} params.rootPolicyId - Root policy ID.
   * @param {number} params.updatedPremiumAmount - Updated premium amount.
   * @param {string} params.currency - Currency.
   * @param {string} params.billingFrequency - Billing frequency.
   * @param {string} params.rootPolicyEndDate - End date of the root policy.
   * @param {Object} params.policyAppData - Policy application data.
   * @param {string} params.stripeProductId - Stripe product ID.
   */
  async processRenewPolicyHook(params: any) {
    const {
      stripeCustomerId,
      rootPolicyId,
      updatedPremiumAmount,
      currency,
      billingFrequency,
      rootPolicyEndDate,
      policyAppData,
      stripeProductId,
    } = params;

    Logger.info('Renewing policy', {
      rootPolicyId,
    });

    const policy = await rootClient.SDK.getPolicyById({
      policyId: rootPolicyId,
    });

    // create the new price
    const newPriceObject = await this.stripeClient.createPrice({
      stripeProductId,
      currency,
      priceAmountInCents: updatedPremiumAmount,
      billingFrequency,
    });

    // create the new subscription schedule
    const stripeSubscriptionSchedule =
      await this.stripeClient.createSubscriptionSchedule({
        stripeCustomerId,
        rootPolicyId,
        rootPolicyNumber: policy.policy_number,
        rootPolicyStartDate: moment().format('YYYY-MM-DDTHH:mm:ss.SSSZ'),
        rootPolicyEndDate,
        billingFrequency,
        stripePriceId: newPriceObject.id,
        prorationBehavior: 'none',
      });

    // detach subscription and schedule ids from the policy
    await rootClient.SDK.updatePolicy({
      policyId: rootPolicyId,
      body: {
        app_data: {
          ...policyAppData,
          stripe_subscription_id: undefined,
          stripe_subscription_schedule_id: undefined,
          stripe_customer_id: stripeCustomerId,
        },
      },
    });

    // update the metadata with the new subscription schedule details
    await rootClient.SDK.updatePolicy({
      policyId: rootPolicyId,
      body: {
        app_data: {
          ...policyAppData,
          stripe_subscription_schedule_id: stripeSubscriptionSchedule.id,
          stripe_subscription_id: stripeSubscriptionSchedule.subscription,
          stripe_customer_id: stripeCustomerId,
        },
      },
    });

    Logger.info('Policy renewed successfully', {
      rootPolicyId,
    });
  }

  /**
   * Handles the renewal process when alterationHookKey is "collect_adhoc_payment". Collects an adhoc payment,
   * Either a claim excess or a cancellation fee.
   *
   * @param {Object} params - Parameters for the update process.
   * @param {string} params.stripeCustomerId - Stripe customer ID.
   * @param {string} params.rootPolicyId - Root policy ID.
   * @param {number} params.updatedPremiumAmount - Updated premium amount.
   * @param {string} params.currency - Currency.
   * @param {string} params.billingFrequency - Billing frequency.
   * @param {string} params.renewalStartDate - Start date of the stripe subscription.
   * @param {string} params.rootPolicyEndDate - End date of the root policy.
   * @param {Object} params.policyAppData - Policy application data.
   * @param {string} params.stripeProductId - Stripe product ID.
   */
  async processCollectAdhocPaymentHook(params: any) {
    const { rootPolicyId, paymentAmount, paymentType, description } = params;
    const rootPaymentMethod = await rootClient.SDK.getPolicyPaymentMethod({
      policyId: rootPolicyId,
    });

    Logger.info('Collecting adhoc payment', {
      rootPolicyId,
      paymentAmount,
      paymentType,
      description,
    });

    await rootClient.SDK.createPolicyPayment({
      policyId: rootPolicyId,
      paymentCreate: {
        status: root.PaymentStatus.Pending,
        amount: paymentAmount,
        description: `${paymentType} - ${description}`,
        payment_date: moment().format('YYYY-MM-DDTHH:mm:ss.SSSZ'),
        payment_type: root.PaymentType.Other,
        payment_method_id: rootPaymentMethod.payment_method_id,
        collection_type: root.CollectionType.CollectionModule,
      },
    });

    Logger.info('Adhoc payment collected successfully', {
      rootPolicyId,
      paymentAmount,
      paymentType,
      description,
    });
  }

  /**
   * Handles the update process when alterationHookKey doesnt have a specific handler.
   *
   * @param {Object} params - Parameters for the update process.
   */
  async processNonSpecificHook(params: {
    stripeCustomerId: string;
    rootPolicyId: string;
    updatedMonthlyPremiumAmount: number;
    currency: string;
    billingFrequency: 'monthly' | 'yearly' | 'once_off';
    rootPolicyStartDate: string;
    rootPolicyEndDate: string;
    policyAppData: any;
    stripeProductId: string;
  }) {
    const {
      rootPolicyId,
      updatedMonthlyPremiumAmount,
      currency,
      billingFrequency,
      rootPolicyStartDate,
      rootPolicyEndDate,
      policyAppData,
      stripeProductId,
    } = params;

    Logger.info('Processing non specific hook', {
      rootPolicyId,
      updatedMonthlyPremiumAmount,
      currency,
      billingFrequency,
      rootPolicyStartDate,
      rootPolicyEndDate,
      policyAppData,
      stripeProductId,
    });

    let premiumAmountInCents = updatedMonthlyPremiumAmount;
    const policy = await rootClient.SDK.getPolicyById({
      policyId: rootPolicyId,
    });

    if (policy.billing_frequency === 'yearly') {
      premiumAmountInCents *= 12;
    }

    const newPriceObject = await this.stripeClient.createPrice({
      stripeProductId,
      currency,
      priceAmountInCents: premiumAmountInCents,
      billingFrequency,
    });

    if (!policyAppData?.stripeCustomerId) {
      Logger.info('Skipping alteration update sync', {
        rootPolicyId,
      });
    }
    const stripeCustomerId = policyAppData.stripe_customer_id;

    if (policyAppData?.stripe_subscription_id) {
      // update the existing active subscription
      const stripeSubscription =
        await this.stripeClient.stripeSDK.subscriptions.retrieve(
          policyAppData?.stripe_subscription_id as string,
        );

      if (stripeSubscription.status === 'active') {
        let prorationBehavior = 'always_invoice';
        // if the new premium amount is less than the current premium amount, and the billing frequency
        // is monthly, we do not want to pro rate, otherwise we want to prorate and invoice the difference immediately
        if (
          policy.billing_frequency === 'monthly' &&
          premiumAmountInCents <
            stripeSubscription.items.data[0].price.unit_amount!
        ) {
          prorationBehavior = 'none';
        }

        const updatedSubscription = await this.stripeClient.updateSubscription(
          stripeSubscription.id,
          {
            prorationBehavior,
            stripePriceId: newPriceObject.id,
            subscriptionItemId: stripeSubscription.items.data[0].id,
          },
        );

        Logger.info('Updated subscription', {
          updatedSubscription,
        });

        if (policy.app_data?.stripe_subscription_schedule_id) {
          // Fetch the schedule before updating the subscription, otherwise the phase start date changes.
          const subscriptionSchedule =
            await this.stripeClient.stripeSDK.subscriptionSchedules.retrieve(
              policy.app_data.stripe_subscription_schedule_id as string,
            );

          Logger.info('Setting subscription Schedule phases', {
            subscriptionSchedule,
          });

          const referenceDate = moment(policy.start_date).isSameOrAfter(
            moment(),
          )
            ? moment(policy.start_date)
            : moment();

          const rootBillingDay = getNextOccurrence(
            referenceDate,
            policy.billing_day || 0,
          );

          // This is custom logic - Client want the billing to go off 7 days before
          let nextPhaseStart = moment(rootBillingDay).unix();

          if (nextPhaseStart < moment().unix()) {
            // We can't update the subscription schedule to a date in the past, so start next month
            nextPhaseStart = moment(rootBillingDay).add(1, 'month').unix();
          }

          // Also update the subscription schedule and any other phases
          await this.stripeClient.stripeSDK.subscriptionSchedules.update(
            subscriptionSchedule.id,
            {
              end_behavior: 'cancel',
              phases: [
                {
                  items: [{ price: newPriceObject.id }],
                  start_date: subscriptionSchedule.phases[0].start_date,
                  end_date: nextPhaseStart,
                  billing_cycle_anchor: 'phase_start',
                },
                {
                  items: [{ price: newPriceObject.id }],
                  end_date: moment(rootPolicyEndDate).unix(),
                  billing_cycle_anchor: 'phase_start',
                },
              ],
            },
          );

          const updatedSubscriptionSchedule =
            await this.stripeClient.stripeSDK.subscriptionSchedules.retrieve(
              policy.app_data.stripe_subscription_schedule_id as string,
            );

          Logger.info('Updated subscription schedule', {
            updatedSubscriptionSchedule,
          });
        }

        Logger.info('Successfully updated subscription', {
          stripeSubscriptionId: stripeSubscription.id,
          rootPolicyId,
        });

        // if the billing frequency is yearly and new premium amount is less than the current premium amount,
        // we need to payout the prorate amount as a refund. The prorate above would have been
        // returned as credit instead of cash. Coverbase want this amount returned as cash as credit will only apply to the next invoice, which will only apply
        // in the following year.

        if (
          policy.billing_frequency === 'yearly' &&
          premiumAmountInCents <
            stripeSubscription.items.data[0].price.unit_amount!
        ) {
          const charges = await this.stripeUtils.getSuccessfulInvoiceCharges({
            stripeCustomerId,
          });

          if (charges.length === 0) {
            Logger.warn(
              'Update Subscription Failed: Policy has no successful invoice charges',
              {
                rootPolicyId,
                stripeSubscriptionId: stripeSubscription.id,
              },
            );

            return;
          }

          let invoiceInfo;
          if (updatedSubscription.latest_invoice) {
            invoiceInfo = await this.stripeClient.stripeSDK.invoices.retrieve(
              updatedSubscription.latest_invoice as string,
            );
          }

          if (invoiceInfo && invoiceInfo.total > 0) {
            Logger.info(`Increase in premium amount, no refund actioned`, {
              invoiceInfo,
              stripeSubscriptionId: stripeSubscription.id,
            });

            return;
          }
          const amountToRefund = invoiceInfo ? Math.abs(invoiceInfo.total) : 0;

          const filteredCharges = charges.filter(
            (item) => item.amount > 0 && item.amount >= amountToRefund,
          );

          if (filteredCharges.length === 0) {
            Logger.info('No charges to refund', {
              rootPolicyId,
              stripeSubscriptionId: stripeSubscription.id,
            });
            return;
          }

          const sortedCharges = filteredCharges.sort((a, b) =>
            a.created > b.created ? -1 : 1,
          );

          const latestChargeId = sortedCharges[0].id;

          await this.stripeClient.stripeSDK.refunds.create({
            charge: latestChargeId,
            amount: amountToRefund,
            reason: 'requested_by_customer',
          });

          Logger.info(`Partial refund successful`, {
            stripeSubscriptionId: stripeSubscription.id,
            latestChargeId,
            amountToRefund,
            rootPolicyId,
          });
        }
        return;
      } else {
        throw new ModuleError(`Update Subscription Failed`, {
          rootPolicyId,
          stripeSubscriptionId: stripeSubscription.id,
          stripeSubscriptionStatus: stripeSubscription.status,
        });
      }
    } else if (policyAppData?.stripe_subscription_schedule_id) {
      Logger.info('Attempting to create new subscription schedule', {
        rootPolicyId,
      });

      const stripeSubscriptionSchedule =
        await this.stripeClient.stripeSDK.subscriptionSchedules.retrieve(
          policyAppData?.stripe_subscription_schedule_id as string,
        );

      if (
        ['not_started', 'active'].includes(stripeSubscriptionSchedule.status)
      ) {
        Logger.info('Cancelling existing subscription schedule', {
          rootPolicyId,
          stripeSubscriptionScheduleId: stripeSubscriptionSchedule.id,
        });
        // cancel the subscription schedule as it has not started yet
        const shouldProrate = false; // we do not want to prorate the subscription schedule as this is a future dated policy that doesn't have a subscription yet
        const invoiceNow = false; // we do not want to invoice the subscription schedule as this is a future dated policy that doesn't have a subscription yet
        await this.stripeClient.stripeSDK.subscriptionSchedules.cancel(
          stripeSubscriptionSchedule.id,
          {
            prorate: shouldProrate,
            invoice_now: invoiceNow,
          },
        );

        Logger.info('Detaching subscription schedule from policy', {
          rootPolicyId,
        });

        // detach subscription and schedule ids from the policy
        await rootClient.SDK.updatePolicy({
          policyId: rootPolicyId,
          body: {
            app_data: {
              ...policyAppData,
              stripe_subscription_id: undefined,
              stripe_subscription_schedule_id: undefined,
              stripe_customer_id: stripeCustomerId,
            },
          },
        });

        Logger.info('Creating new subscription schedule for policy', {
          rootPolicyId,
        });

        // create a new price for the new subscription schedule
        const newPriceObject = await this.stripeClient.createPrice({
          stripeProductId,
          currency,
          priceAmountInCents: updatedMonthlyPremiumAmount,
          billingFrequency,
        });

        // create a new subscription schedule
        const newStripeSubscriptionSchedule =
          await this.stripeClient.createSubscriptionSchedule({
            stripeCustomerId,
            rootPolicyId,
            rootPolicyNumber: policy.policy_number,
            rootPolicyStartDate,
            rootPolicyEndDate,
            billingFrequency,
            stripePriceId: newPriceObject.id,
            prorationBehavior: 'none',
          });

        // update the metadata with the new subscription schedule details

        Logger.info('Attaching new subscription schedule to policy', {
          rootPolicyId,
        });
        await rootClient.SDK.updatePolicy({
          policyId: rootPolicyId,
          body: {
            app_data: {
              ...policyAppData,
              stripe_subscription_schedule_id: newStripeSubscriptionSchedule.id,
              stripe_subscription_id:
                newStripeSubscriptionSchedule.subscription,
              stripe_customer_id: stripeCustomerId,
            },
          },
        });
      } else {
        throw new ModuleError(`Update Subscription Schedule Failed`, {
          rootPolicyId,
          stripeSubscriptionScheduleId: stripeSubscriptionSchedule.id,
          stripeSubscriptionScheduleStatus: stripeSubscriptionSchedule.status,
        });
      }
      return;
    } else {
      // If no subscription or schedule, throw an error
      throw new ModuleError(
        'Policy app data is missing Stripe subscription or schedule ids',
        {
          rootPolicyId,
        },
      );
    }
  }

  /**
   * Calculates the number of months left on a subscription based on the root policy's end date and billing day.
   *
   * @param {Object} params - The params object.
   * @param {string} params.rootPolicyEndDate - The end date of the root policy in string format (e.g., "2023-12-31").
   * @param {number} params.billingDay - The day of the month when billing occurs.
   *
   * @returns {number} The number of months left on the subscription, adjusted for the billing day.
   *
   */
  getMonthsLeftOnSubscription({
    rootPolicyEndDate,
    billingDay,
  }: {
    rootPolicyEndDate: string;
    billingDay: number | null;
  }) {
    if (!billingDay) {
      throw new ModuleError('Billing day is required to calculate months left');
    }

    // Explicitly set the time to the start of the day (midnight)
    // to avoid Timezone issues and off by one errors
    const currentDate = moment().startOf('day');
    const endDate = moment(rootPolicyEndDate).startOf('day');

    // Calculate the number of months left
    let monthsLeft = endDate.diff(currentDate, 'months');

    Logger.info('Calculating months left on subscription', {
      currentDate: currentDate.format('YYYY-MM-DD'),
      endDate: endDate.format('YYYY-MM-DD'),
      billingDay,
      monthsLeft,
    });

    // Adjust for the billing day, if its on the billing day, Stripe would have already charged for the month
    if (billingDay <= currentDate.date()) {
      monthsLeft--;
      // Log when reducing months
      Logger.info(`Adjustment: Months Left (After Adjustment): ${monthsLeft}`);
    }

    return monthsLeft;
  }
}

export default ProcessPolicyAlterationEventsController;
