# Core / DI Container (Reference)

## Container API (container.ts)

- `register(token, factory, lifetime)` — Register a service
- `resolve<T>(token)` — Get instance
- `has(token)` — Check registration
- `unregister(token)` — Remove
- `replace(token, factory, lifetime)` — Replace (for testing)
- `clear()` — Remove all
- `getRegisteredTokens()` — List tokens

## ServiceLifetime

- **SINGLETON**: One instance (LogService, ConfigService)
- **TRANSIENT**: New instance each resolve (controllers)

## ServiceToken

Symbols for type-safe identifiers, e.g. `LOG_SERVICE`, `CONFIG_SERVICE`, `ROOT_SERVICE`, `RENDER_SERVICE`, `INVOICE_PAID_CONTROLLER`.

## container.setup.ts

- `createContainer()` — New configured container
- `getContainer()` — Global singleton container
- `setContainer(container)` — Set global (testing)
- `resetContainer()` — Clear global

## Registering a New Service

1. Add token in `core/container.ts`: `MY_SERVICE: Symbol('MyService')`
2. In `container.setup.ts`:
   ```typescript
   container.register(
     ServiceToken.MY_SERVICE,
     (c) => {
       const logService = c.resolve<LogService>(ServiceToken.LOG_SERVICE);
       const { MyService } = require('../services/my.service');
       return new MyService(logService);
     },
     ServiceLifetime.SINGLETON
   );
   ```
3. Use: `getContainer().resolve(ServiceToken.MY_SERVICE)`

## Testing

- **Replace**: `container.replace(ServiceToken.LOG_SERVICE, () => mockLogService, ...)` then `setContainer(container)`
- **Test container**: Create container with only mocks, `setContainer(testContainer)`
- **Direct injection**: In unit tests, `new MyService(mockLogService)` without container

## Do / Don't

- Do: Use ServiceTokens; register at startup; inject via constructor; SINGLETON for stateful, TRANSIENT for controllers
- Don't: `new` services in app code; string tokens; circular dependencies; skip DI in tests
