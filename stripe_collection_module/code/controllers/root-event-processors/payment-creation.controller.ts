/**
 * Payment Creation Event Controller
 *
 * Handles Root Platform payment creation lifecycle hook.
 * When a payment is created on Root, this creates a corresponding payment intent on Stripe.
 *
 * Architecture:
 * - Uses dependency injection for testability
 * - Delegates business logic to services
 * - Focuses on orchestration only
 */

import * as root from '@rootplatform/node-sdk';
import Stripe from 'stripe';
import { LogService } from '../../services/log.service';
import { RootService } from '../../services/root.service';
import StripeClient from '../../clients/stripe-client';

export interface PaymentCreationParams {
  rootPaymentId: string;
  rootPolicyId: string;
  amount: number;
  description: string;
  status: root.PaymentStatus;
}

export class PaymentCreationController {
  constructor(
    private readonly logService: LogService,
    private readonly rootService: RootService,
    private readonly stripeClient: StripeClient
  ) {}

  /**
   * Handle payment creation event
   *
   * @param params - Payment creation parameters from Root Platform
   */
  async handle(params: PaymentCreationParams): Promise<void> {
    this.logService.info(
      'Processing payment creation event',
      'PaymentCreationController',
      {
        rootPaymentId: params.rootPaymentId,
        rootPolicyId: params.rootPolicyId,
        amount: params.amount,
      }
    );

    // 1. Validate payment should be processed
    if (!this.shouldProcessPayment(params)) {
      return;
    }

    // 2. Get policy details from Root
    const policy = await this.rootService.getPolicy(params.rootPolicyId);

    // 3. Validate policy has Stripe customer ID
    const stripeCustomerId = policy.app_data?.stripe_customer_id;
    if (!stripeCustomerId) {
      throw new Error(
        `Policy ${policy.policy_id} is missing stripe_customer_id in app_data`
      );
    }

    // 4. Create payment intent on Stripe
    const paymentIntent = await this.createStripePaymentIntent({
      ...params,
      stripeCustomerId,
      currency: policy.currency,
    });

    this.logService.info(
      'Successfully created Stripe payment intent',
      'PaymentCreationController',
      {
        rootPaymentId: params.rootPaymentId,
        paymentIntentId: paymentIntent.id,
        status: paymentIntent.status,
      }
    );
  }

  /**
   * Determine if payment should be processed by this collection module
   */
  private shouldProcessPayment(params: PaymentCreationParams): boolean {
    // Skip if payment already has a Stripe invoice
    if (
      params.description.includes('Stripe created invoice item:') ||
      params.description.includes('Refund for Stripe charge:')
    ) {
      this.logService.info(
        'Skipping payment - already has associated Stripe invoice',
        'PaymentCreationController',
        {
          rootPaymentId: params.rootPaymentId,
          description: params.description,
        }
      );
      return false;
    }

    // Only process pending payments
    if (params.status !== root.PaymentStatus.Pending) {
      this.logService.info(
        'Skipping payment - not in pending status',
        'PaymentCreationController',
        {
          rootPaymentId: params.rootPaymentId,
          status: params.status,
        }
      );
      return false;
    }

    return true;
  }

  /**
   * Create payment intent on Stripe
   */
  private async createStripePaymentIntent(params: {
    rootPaymentId: string;
    rootPolicyId: string;
    amount: number;
    description: string;
    stripeCustomerId: string;
    currency: string;
  }): Promise<Stripe.PaymentIntent> {
    this.logService.info(
      'Creating Stripe payment intent',
      'PaymentCreationController',
      {
        amount: params.amount,
        currency: params.currency,
      }
    );

    try {
      const paymentIntent =
        await this.stripeClient.stripeSDK.paymentIntents.create({
          amount: params.amount,
          currency: params.currency,
          customer: params.stripeCustomerId,
          description: params.description,
          metadata: {
            rootPaymentId: params.rootPaymentId,
            rootPolicyId: params.rootPolicyId,
          },
          payment_method_types: ['card'],
          confirm: true,
          off_session: true,
        });

      return paymentIntent;
    } catch (error: any) {
      this.logService.error(
        'Failed to create Stripe payment intent',
        'PaymentCreationController',
        {
          error: error.message,
          rootPaymentId: params.rootPaymentId,
        }
      );
      throw error;
    }
  }
}
