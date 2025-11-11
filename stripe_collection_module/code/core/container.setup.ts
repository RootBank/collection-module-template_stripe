/**
 * Container Setup
 *
 * Configures and initializes the DI container with all services
 */

import { Container, ServiceToken, ServiceLifetime } from './container';
import { LogService } from '../services/log.service';
import { ConfigurationService } from '../services/config.service';

/**
 * Create and configure the application container
 *
 * This function sets up all service registrations.
 * Call this once at application startup.
 *
 * @example
 * ```typescript
 * const container = createContainer();
 * const logService = container.resolve<LogService>(ServiceToken.LOG_SERVICE);
 * ```
 */
export function createContainer(): Container {
  const container = new Container();

  // Register ConfigurationService first (other services depend on it)
  container.register(
    ServiceToken.CONFIG_SERVICE,
    () => new ConfigurationService(),
    ServiceLifetime.SINGLETON
  );

  // Register LogService
  container.register(
    ServiceToken.LOG_SERVICE,
    (c) => {
      const config = c.resolve<ConfigurationService>(
        ServiceToken.CONFIG_SERVICE
      );
      return new LogService({
        environment: config.get('environment'),
      });
    },
    ServiceLifetime.SINGLETON
  );

  // Register API Clients (Infrastructure Layer)
  container.register(
    ServiceToken.STRIPE_CLIENT,
    () => {
      // eslint-disable-next-line unicorn/prefer-module
      const StripeClient = require('../clients/stripe-client').default;
      return new StripeClient();
    },
    ServiceLifetime.SINGLETON
  );

  container.register(
    ServiceToken.ROOT_CLIENT,
    () => {
      // eslint-disable-next-line unicorn/prefer-module
      const RootClient = require('../clients/root-client').default;
      return new RootClient();
    },
    ServiceLifetime.SINGLETON
  );

  // Register Business Services
  container.register(
    ServiceToken.ROOT_SERVICE,
    (c) => {
      const logService = c.resolve<LogService>(ServiceToken.LOG_SERVICE);
      const rootClient = c.resolve(ServiceToken.ROOT_CLIENT);
      // eslint-disable-next-line unicorn/prefer-module
      return new (require('../services/root.service').RootService)(
        logService,
        rootClient
      );
    },
    ServiceLifetime.SINGLETON
  );

  container.register(
    ServiceToken.STRIPE_SERVICE,
    (c) => {
      const logService = c.resolve<LogService>(ServiceToken.LOG_SERVICE);
      const stripeClient = c.resolve(ServiceToken.STRIPE_CLIENT);
      // eslint-disable-next-line unicorn/prefer-module
      return new (require('../services/stripe.service').StripeService)(
        logService,
        stripeClient
      );
    },
    ServiceLifetime.SINGLETON
  );

  // Register RenderService
  container.register(
    ServiceToken.RENDER_SERVICE,
    () => {
      // eslint-disable-next-line unicorn/prefer-module
      return new (require('../services/render.service').RenderService)();
    },
    ServiceLifetime.SINGLETON
  );

  // Register Controllers here
  // Example:
  // container.register(
  //   ServiceToken.YOUR_CONTROLLER,
  //   (c) => {
  //     const logService = c.resolve<LogService>(ServiceToken.LOG_SERVICE);
  //     const yourService = c.resolve(ServiceToken.YOUR_SERVICE);
  //     return new YourController(logService, yourService);
  //   },
  //   ServiceLifetime.TRANSIENT
  // );

  return container;
}

// Global container instance (for now)
// TODO: This will be replaced with proper request-scoped containers
let globalContainer: Container | null = null;

/**
 * Get the global container instance
 * Creates it if it doesn't exist
 */
export function getContainer(): Container {
  if (!globalContainer) {
    globalContainer = createContainer();
  }
  return globalContainer;
}

/**
 * Set the global container (useful for testing)
 */
export function setContainer(container: Container): void {
  globalContainer = container;
}

/**
 * Reset the global container
 */
export function resetContainer(): void {
  globalContainer = null;
}
