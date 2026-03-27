/**
 * StripeClient Tests
 */

jest.mock('../../code/services/config-instance');

import StripeClient from '../../code/clients/stripe-client';
import { setupConfigMock } from '../test-helpers';

describe('StripeClient', () => {
  beforeEach(() => {
    setupConfigMock();
  });

  it('should instantiate with Stripe SDK', () => {
    const client = new StripeClient();
    
    expect(client).toBeDefined();
    expect(client.stripeSDK).toBeDefined();
  });

  it('should have stripeSDK property', () => {
    const client = new StripeClient();
    
    expect(client.stripeSDK).toBeTruthy();
    expect(typeof client.stripeSDK).toBe('object');
  });

  it('should create new instance each time', () => {
    const client1 = new StripeClient();
    const client2 = new StripeClient();
    
    expect(client1).not.toBe(client2);
  });
});
