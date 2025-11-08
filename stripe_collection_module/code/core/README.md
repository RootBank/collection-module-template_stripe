# Core

This directory contains the core infrastructure of the application, including the Dependency Injection (DI) container system.

## What's in Core?

- **Dependency Injection Container** - Manages service lifecycles and dependencies
- **Service Tokens** - Type-safe service identifiers
- **Container Setup** - Service registration configuration

## Dependency Injection Container

The DI container provides:
- Automatic dependency resolution
- Lifecycle management (Singleton vs Transient)
- Service replacement for testing
- Loose coupling between components

**Pattern**:

```typescript
// Dependencies injected via constructor
class PaymentService {
  constructor(
    private logService: LogService,
    private stripeClient: StripeClient
  ) {}
}
```

## Container API

### container.ts

The core DI container implementation.

**Key Classes**:

#### Container

Main container class for service management.

```typescript
import { Container, ServiceLifetime } from './container';

const container = new Container();

// Register a service
container.register(
  'MyService',
  () => new MyService(),
  ServiceLifetime.SINGLETON
);

// Resolve a service
const myService = container.resolve<MyService>('MyService');

// Check if registered
if (container.has('MyService')) {
  // Service exists
}

// Replace for testing
container.replace('MyService', () => mockMyService);

// Clear all
container.clear();
```

**Methods**:
- `register(token, factory, lifetime)` - Register a service
- `resolve<T>(token)` - Get service instance
- `has(token)` - Check if service is registered
- `unregister(token)` - Remove service
- `replace(token, factory, lifetime)` - Replace service (useful for testing)
- `clear()` - Remove all services
- `getRegisteredTokens()` - List all registered tokens

#### ServiceLifetime

Service lifecycle enum:

```typescript
export enum ServiceLifetime {
  SINGLETON = 'singleton', // One instance for entire app
  TRANSIENT = 'transient', // New instance every time
}
```

**Usage**:
- **Singleton**: LogService, ConfigService (shared state/expensive to create)
- **Transient**: Controllers (per-request instances)

#### ServiceToken

Type-safe service identifiers using Symbols.

```typescript
export const ServiceToken = {
  // Core Services
  LOG_SERVICE: Symbol('LogService'),
  CONFIG_SERVICE: Symbol('ConfigService'),
  
  // Business Services
  ROOT_SERVICE: Symbol('RootService'),
  RENDER_SERVICE: Symbol('RenderService'),
  
  // Controllers
  INVOICE_PAID_CONTROLLER: Symbol('InvoicePaidController'),
  PAYMENT_CREATION_CONTROLLER: Symbol('PaymentCreationController'),
} as const;
```

Symbols provide type safety and prevent naming collisions.

## Container Setup

### container.setup.ts

Configures all service registrations.

**Key Functions**:

#### createContainer()

Creates and configures a new container with all services.

```typescript
import { createContainer } from './core/container.setup';

const container = createContainer();
const logService = container.resolve<LogService>(ServiceToken.LOG_SERVICE);
```

#### getContainer()

Gets the global singleton container instance.

```typescript
import { getContainer } from './core/container.setup';

const container = getContainer();
// Container is already configured with all services
```

#### setContainer()

Sets the global container (useful for testing).

```typescript
import { setContainer } from './core/container.setup';

const testContainer = createTestContainer();
setContainer(testContainer);
```

#### resetContainer()

Clears the global container.

```typescript
import { resetContainer } from './core/container.setup';

afterEach(() => {
  resetContainer(); // Clean state between tests
});
```

## Service Registration

### Registering a New Service

#### 1. Add Service Token

```typescript
// core/container.ts
export const ServiceToken = {
  // ... existing tokens
  MY_NEW_SERVICE: Symbol('MyNewService'),
} as const;
```

#### 2. Register in Container Setup

```typescript
// core/container.setup.ts
container.register(
  ServiceToken.MY_NEW_SERVICE,
  (c) => {
    // Resolve dependencies from container
    const logService = c.resolve<LogService>(ServiceToken.LOG_SERVICE);
    const config = c.resolve<ConfigurationService>(ServiceToken.CONFIG_SERVICE);
    
    // Create service with dependencies
    const { MyNewService } = require('../services/my-new.service');
    return new MyNewService(logService, config);
  },
  ServiceLifetime.SINGLETON // or TRANSIENT
);
```

#### 3. Use in Your Code

```typescript
import { getContainer } from './core/container.setup';
import { ServiceToken } from './core/container';

const container = getContainer();
const myService = container.resolve(ServiceToken.MY_NEW_SERVICE);
await myService.doSomething();
```

## Registration Patterns

### Singleton Service

For services with state or expensive initialization:

```typescript
container.register(
  ServiceToken.CONFIG_SERVICE,
  () => new ConfigurationService(),
  ServiceLifetime.SINGLETON
);

// Same instance every time
const config1 = container.resolve(ServiceToken.CONFIG_SERVICE);
const config2 = container.resolve(ServiceToken.CONFIG_SERVICE);
// config1 === config2 ✅
```

### Transient Service (Controllers)

For stateless services or per-request instances:

```typescript
container.register(
  ServiceToken.INVOICE_PAID_CONTROLLER,
  (c) => {
    const logService = c.resolve<LogService>(ServiceToken.LOG_SERVICE);
    const rootService = c.resolve(ServiceToken.ROOT_SERVICE);
    
    const { InvoicePaidController } = require(
      '../controllers/stripe-event-processors/invoice-paid.controller'
    );
    return new InvoicePaidController(logService, rootService);
  },
  ServiceLifetime.TRANSIENT
);

// Different instance every time
const controller1 = container.resolve(ServiceToken.INVOICE_PAID_CONTROLLER);
const controller2 = container.resolve(ServiceToken.INVOICE_PAID_CONTROLLER);
// controller1 !== controller2 ✅
```

### Service with Dependencies

```typescript
container.register(
  ServiceToken.ROOT_SERVICE,
  (c) => {
    // Resolve dependencies from container
    const logService = c.resolve<LogService>(ServiceToken.LOG_SERVICE);
    
    // Create service with injected dependencies
    const { RootService } = require('../services/root.service');
    return new RootService(logService);
  },
  ServiceLifetime.SINGLETON
);
```

### Lazy Loading Services

```typescript
container.register(
  ServiceToken.MY_SERVICE,
  (c) => {
    // Use require() for lazy loading
    // Service file only loaded when first resolved
    const { MyService } = require('../services/my.service');
    return new MyService(/* dependencies */);
  },
  ServiceLifetime.SINGLETON
);
```

## Testing with DI Container

### Option 1: Replace Services

```typescript
import { getContainer, setContainer } from '../core/container.setup';
import { ServiceToken } from '../core/container';

describe('MyController', () => {
  let container: Container;
  let mockLogService: jest.Mocked<LogService>;

  beforeEach(() => {
    // Get fresh container
    container = createContainer();
    
    // Replace service with mock
    mockLogService = {
      info: jest.fn(),
      error: jest.fn(),
    } as any;
    
    container.replace(
      ServiceToken.LOG_SERVICE,
      () => mockLogService,
      ServiceLifetime.SINGLETON
    );
    
    // Set as global container
    setContainer(container);
  });

  afterEach(() => {
    resetContainer();
  });

  it('should log operations', () => {
    const controller = container.resolve(ServiceToken.MY_CONTROLLER);
    controller.handle();
    
    expect(mockLogService.info).toHaveBeenCalled();
  });
});
```

### Option 2: Create Test Container

```typescript
function createTestContainer(): Container {
  const container = new Container();
  
  // Register mocks
  container.register(
    ServiceToken.LOG_SERVICE,
    () => createMockLogService(),
    ServiceLifetime.SINGLETON
  );
  
  container.register(
    ServiceToken.CONFIG_SERVICE,
    () => createMockConfig(),
    ServiceLifetime.SINGLETON
  );
  
  return container;
}

describe('Integration Tests', () => {
  beforeEach(() => {
    const testContainer = createTestContainer();
    setContainer(testContainer);
  });
  
  // Tests use mocked services
});
```

### Option 3: Direct Injection (Unit Tests)

```typescript
describe('MyService', () => {
  let service: MyService;
  let mockLogService: jest.Mocked<LogService>;

  beforeEach(() => {
    mockLogService = {
      info: jest.fn(),
      error: jest.fn(),
    } as any;
    
    // Don't use container - inject directly
    service = new MyService(mockLogService);
  });

  it('should do something', () => {
    service.doSomething();
    expect(mockLogService.info).toHaveBeenCalled();
  });
});
```

## Best Practices

### Do ✅

- Use ServiceTokens (Symbols) for type safety
- Register services at startup
- Inject dependencies via constructor
- Use SINGLETON for stateful services
- Use TRANSIENT for controllers
- Test with mocked services
- Document dependencies

### Don't ❌

- Create services with `new` in application code
- Use string literals as service tokens
- Register services dynamically at runtime
- Make services depend on the container
- Skip dependency injection for testing
- Create circular dependencies

## Common Patterns

### Factory Pattern

```typescript
container.register(
  ServiceToken.STRIPE_CLIENT,
  (c) => {
    const config = c.resolve<ConfigurationService>(ServiceToken.CONFIG_SERVICE);
    
    // Factory creates client with config
    return new StripeClient(config.get('stripeSecretKey'));
  },
  ServiceLifetime.SINGLETON
);
```

### Conditional Registration

```typescript
container.register(
  ServiceToken.CACHE_SERVICE,
  (c) => {
    const config = c.resolve<ConfigurationService>(ServiceToken.CONFIG_SERVICE);
    
    // Return different implementations based on config
    if (config.isProduction()) {
      return new RedisCacheService();
    } else {
      return new InMemoryCacheService();
    }
  },
  ServiceLifetime.SINGLETON
);
```

### Decorator Pattern

```typescript
container.register(
  ServiceToken.PAYMENT_SERVICE,
  (c) => {
    const baseService = new PaymentService();
    const logService = c.resolve<LogService>(ServiceToken.LOG_SERVICE);
    
    // Wrap service with logging decorator
    return new LoggingPaymentService(baseService, logService);
  },
  ServiceLifetime.SINGLETON
);
```

## Troubleshooting

### "Service not registered" Error

```typescript
// Problem: Token not registered
const service = container.resolve(ServiceToken.MY_SERVICE);
// Error: Service not registered: Symbol(MyService)

// Solution: Register the service in container.setup.ts
container.register(ServiceToken.MY_SERVICE, ...);
```

### Circular Dependencies

```typescript
// Problem: A depends on B, B depends on A
class ServiceA {
  constructor(private serviceB: ServiceB) {}
}

class ServiceB {
  constructor(private serviceA: ServiceA) {}
}

// Solution: Refactor to remove circular dependency
// - Extract shared logic to a third service
// - Use events/callbacks instead of direct dependencies
// - Rethink your design
```

### Singleton Not Working

```typescript
// Problem: Getting different instances
const service1 = container.resolve(ServiceToken.MY_SERVICE);
const service2 = container.resolve(ServiceToken.MY_SERVICE);
// service1 !== service2 ❌

// Solution: Check lifecycle is SINGLETON
container.register(
  ServiceToken.MY_SERVICE,
  factory,
  ServiceLifetime.SINGLETON // Make sure this is set!
);
```

## Related Documentation

- [Services Documentation](../services/README.md) - Creating services for DI
- [Controllers Documentation](../controllers/README.md) - Using DI in controllers
- [Testing Guide](../../docs/TESTING.md) - Testing with DI
- [Best Practices](../../docs/BEST_PRACTICES.md) - DI patterns

