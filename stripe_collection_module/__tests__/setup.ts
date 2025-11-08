/// <reference types="jest" />
/**
 * Jest setup file
 * This file runs before all tests
 */

// Set up test environment variables
process.env.ENVIRONMENT = 'development';
process.env.NODE_ENV = 'test';
process.env.ROOT_COLLECTION_MODULE_KEY = 'test_collection_module';
process.env.ROOT_COLLECTION_MODULE_SECRET = 'test_secret';
process.env.STRIPE_SECRET_KEY = 'sk_test_123';
process.env.STRIPE_PUBLISHABLE_KEY = 'pk_test_123';

// Extend Jest matchers if needed
// import '@testing-library/jest-dom';

// Set up any global test configuration here

