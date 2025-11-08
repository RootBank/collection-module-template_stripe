/**
 * RootClient Tests
 */

jest.mock('../../code/services/config-instance', () => ({
  getConfigService: jest.fn(() => ({
    get: jest.fn((key: string) => {
      if (key === 'rootApiKey') return 'test_root_key';
      if (key === 'rootBaseUrl') return 'https://test.root.co.za';
      return null;
    }),
  })),
}));

import rootClient from '../../code/clients/root-client';

describe('RootClient', () => {
  it('should export a singleton instance', () => {
    expect(rootClient).toBeDefined();
    expect(rootClient.SDK).toBeDefined();
  });

  it('should have SDK property', () => {
    expect(rootClient.SDK).toBeTruthy();
  });

  it('should initialize SDK with configuration', () => {
    // SDK should be initialized (we can't test internals but can verify it exists)
    expect(typeof rootClient.SDK).toBe('object');
  });
});
