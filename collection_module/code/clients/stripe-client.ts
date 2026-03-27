import Stripe from 'stripe';
import { getConfigService } from '../services/config-instance';

export default class StripeClient {
  public stripeSDK: Stripe;

  constructor() {
    const config = getConfigService();
    this.stripeSDK = new Stripe(config.get('providerSecretKey'));
  }
}
