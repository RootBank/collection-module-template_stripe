import * as env from './env';

interface EnvironmentConfig {
  timeDelayInMilliseconds: string;
  environment: string;
  stripeWebhookSigningSecret: string;
  stripeProductId: string;
  rootCollectionModuleKey: string;
  stripePublishableKey: string;
  stripeSecretKey: string;
  rootApiKey: string;
  rootBaseUrl: string;
}

interface IConfig {
  production: EnvironmentConfig;
  development: EnvironmentConfig;
}

const baseConfig = {
  timeDelayInMilliseconds: env.TIME_DELAY_IN_MILLISECONDS,
  rootCollectionModuleKey: env.ROOT_COLLECTION_MODULE_KEY,
  environment: process.env.ENVIRONMENT || 'development',
};

const production: EnvironmentConfig = {
  ...baseConfig,
  stripeWebhookSigningSecret: env.STRIPE_WEBHOOK_SIGNING_SECRET_LIVE,
  stripePublishableKey: env.STRIPE_PUBLISHABLE_KEY_LIVE,
  stripeSecretKey: env.STRIPE_SECRET_KEY_LIVE,
  stripeProductId: env.STRIPE_PRODUCT_ID_LIVE,
  rootApiKey: env.ROOT_API_KEY_LIVE,
  rootBaseUrl: env.ROOT_BASE_URL_LIVE,
};

const development: EnvironmentConfig = {
  ...baseConfig,
  stripeWebhookSigningSecret: env.STRIPE_WEBHOOK_SIGNING_SECRET_TEST,
  stripePublishableKey: env.STRIPE_PUBLISHABLE_KEY_TEST,
  stripeSecretKey: env.STRIPE_SECRET_KEY_TEST,
  stripeProductId: env.STRIPE_PRODUCT_ID_TEST,
  rootApiKey: env.ROOT_API_KEY_SANDBOX,
  rootBaseUrl: env.ROOT_BASE_URL_SANDBOX,
};

const config: IConfig = {
  production,
  development,
};

class ConfigurationService {
  public env: EnvironmentConfig;
  protected environment: string;

  public isProduction: boolean;

  constructor() {
    this.environment = process.env.ENVIRONMENT || 'development';
    this.validateEnvironment();
    this.env = config[this.environment as keyof typeof config];
    this.isProduction = this.env.environment === 'production';
  }

  private validateEnvironment() {
    if (!this.environment) {
      throw new Error('ENVIRONMENT is not set');
    }

    const configs = Object.keys(config);

    if (!configs.includes(this.environment)) {
      throw new Error(`invalid value for ENVIRONMENT: ${this.environment}`);
    }

    const thisConfig = config[this.environment as keyof typeof config];

    const envValid = Object.values(thisConfig).every((el) => el !== '');

    if (!envValid) {
      const envKeys = Object.keys(thisConfig);
      throw new Error(
        `Invalid environment configuration, expected: ${envKeys.join(', ')}`,
      );
    }
  }
}
const Config = new ConfigurationService();
export default Config;
