/**
 * StripeService - Business logic for Stripe operations
 *
 * This service provides a high-level interface for Stripe operations.
 * It wraps the Stripe client and provides domain-specific methods.
 */

import Stripe from 'stripe';
import { LogService } from './log.service';
import StripeClient from '../clients/stripe-client';

export interface CreateCustomerParams {
  email: string;
  name?: string;
  metadata?: Record<string, string>;
}

export interface CreatePaymentIntentParams {
  amount: number;
  currency: string;
  customerId: string;
  description?: string;
  metadata?: Record<string, string>;
  confirm?: boolean;
  offSession?: boolean;
}

export interface AttachPaymentMethodParams {
  paymentMethodId: string;
  customerId: string;
}

export class StripeService {
  constructor(
    private readonly logService: LogService,
    private readonly stripeClient: StripeClient
  ) {}

  /**
   * Create a Stripe customer
   */
  async createCustomer(params: CreateCustomerParams): Promise<Stripe.Customer> {
    this.logService.info('Creating Stripe customer', 'StripeService', {
      email: params.email,
    });

    try {
      const customer = await this.stripeClient.stripeSDK.customers.create({
        email: params.email,
        name: params.name,
        metadata: params.metadata,
      });

      this.logService.info(
        'Stripe customer created successfully',
        'StripeService',
        {
          customerId: customer.id,
          email: customer.email,
        }
      );

      return customer;
    } catch (error: any) {
      this.logService.error(
        `Failed to create Stripe customer: ${error.message}`,
        'StripeService',
        { params, error }
      );
      throw error;
    }
  }

  /**
   * Get a Stripe customer by ID
   */
  async getCustomer(customerId: string): Promise<Stripe.Customer> {
    this.logService.debug(
      `Getting Stripe customer: ${customerId}`,
      'StripeService'
    );

    try {
      const customer =
        await this.stripeClient.stripeSDK.customers.retrieve(customerId);

      if (customer.deleted) {
        throw new Error(`Customer ${customerId} has been deleted`);
      }

      return customer as Stripe.Customer;
    } catch (error: any) {
      this.logService.error(
        `Failed to get Stripe customer: ${error.message}`,
        'StripeService',
        { customerId, error }
      );
      throw error;
    }
  }

  /**
   * Update a Stripe customer
   */
  async updateCustomer(
    customerId: string,
    params: Stripe.CustomerUpdateParams
  ): Promise<Stripe.Customer> {
    this.logService.info('Updating Stripe customer', 'StripeService', {
      customerId,
    });

    try {
      const customer = await this.stripeClient.stripeSDK.customers.update(
        customerId,
        params
      );

      this.logService.info(
        'Stripe customer updated successfully',
        'StripeService',
        {
          customerId: customer.id,
        }
      );

      return customer;
    } catch (error: any) {
      this.logService.error(
        `Failed to update Stripe customer: ${error.message}`,
        'StripeService',
        { customerId, params, error }
      );
      throw error;
    }
  }

  /**
   * Create a payment intent
   */
  async createPaymentIntent(
    params: CreatePaymentIntentParams
  ): Promise<Stripe.PaymentIntent> {
    this.logService.info('Creating Stripe payment intent', 'StripeService', {
      amount: params.amount,
      currency: params.currency,
      customerId: params.customerId,
    });

    try {
      const paymentIntent =
        await this.stripeClient.stripeSDK.paymentIntents.create({
          amount: params.amount,
          currency: params.currency,
          customer: params.customerId,
          description: params.description,
          metadata: params.metadata,
          payment_method_types: ['card'],
          confirm: params.confirm,
          off_session: params.offSession,
        });

      this.logService.info(
        'Payment intent created successfully',
        'StripeService',
        {
          paymentIntentId: paymentIntent.id,
          status: paymentIntent.status,
        }
      );

      return paymentIntent;
    } catch (error: any) {
      this.logService.error(
        `Failed to create payment intent: ${error.message}`,
        'StripeService',
        { params, error }
      );
      throw error;
    }
  }

  /**
   * Get a payment method by ID
   */
  async getPaymentMethod(
    paymentMethodId: string
  ): Promise<Stripe.PaymentMethod> {
    this.logService.debug(
      `Getting payment method: ${paymentMethodId}`,
      'StripeService'
    );

    try {
      return await this.stripeClient.stripeSDK.paymentMethods.retrieve(
        paymentMethodId
      );
    } catch (error: any) {
      this.logService.error(
        `Failed to get payment method: ${error.message}`,
        'StripeService',
        { paymentMethodId, error }
      );
      throw error;
    }
  }

  /**
   * Attach a payment method to a customer
   */
  async attachPaymentMethod(
    params: AttachPaymentMethodParams
  ): Promise<Stripe.PaymentMethod> {
    this.logService.info('Attaching payment method', 'StripeService', params);

    try {
      const paymentMethod =
        await this.stripeClient.stripeSDK.paymentMethods.attach(
          params.paymentMethodId,
          {
            customer: params.customerId,
          }
        );

      this.logService.info(
        'Payment method attached successfully',
        'StripeService',
        {
          paymentMethodId: params.paymentMethodId,
          customerId: params.customerId,
        }
      );

      return paymentMethod;
    } catch (error: any) {
      this.logService.error(
        `Failed to attach payment method: ${error.message}`,
        'StripeService',
        { params, error }
      );
      throw error;
    }
  }

  /**
   * Cancel a subscription
   */
  async cancelSubscription(
    subscriptionId: string
  ): Promise<Stripe.Subscription> {
    this.logService.info('Canceling Stripe subscription', 'StripeService', {
      subscriptionId,
    });

    try {
      const subscription =
        await this.stripeClient.stripeSDK.subscriptions.cancel(subscriptionId);

      this.logService.info(
        'Subscription canceled successfully',
        'StripeService',
        {
          subscriptionId,
          status: subscription.status,
        }
      );

      return subscription;
    } catch (error: any) {
      this.logService.error(
        `Failed to cancel subscription: ${error.message}`,
        'StripeService',
        { subscriptionId, error }
      );
      throw error;
    }
  }
}
