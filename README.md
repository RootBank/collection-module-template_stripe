# Stripe Collection Module
This repository contains the Collection Module example template for integrating
Stripe with the Root platform.

For a template to be available to be used by developers, it has to be assigned
to the Template Organization in that stack. Every stack has a Template
Organization, and those are the details you need to update in the targets.yaml
file.

## Getting started with a new template

If the template is brand new and doesn't exist on the target Template
Organisation, start by creating the Collection Module on the Template
Organisation. Remember to update the key in the payload below.

Endpoint

```bash
> POST /v1/insurance/collection-modules HTTP/1.1
```

Payload

```json
{
  "key": "payment_provider_cm_template",
  "name": "Payment Provider Collection Module Template",
  "key_of_collection_module_to_clone": "blank_starter_template"
}
```

For updating existing collection modules, you can go ahead and deploy any
changes using the instructions below.

## Configuration

### Root Config
Copy .root-config.sample.json and rename to .root-config.json. Add your root configuration here.

| Variable                 | Description                                                                                  |
| ------------------------ | -------------------------------------------------------------------------------------------- |
| `collectionModuleKey`    | The unique key of the collection module.                                                     |
| `collectionModuleName`   | The name of the collection module.                                                           |
| `organizationId`         | The Root organization ID for the collection module.                                          |
| `host`                   | The host URL                                                                                 |


### Env.ts

Copy env.sample and rename to env.ts. Add your environment variables here.

| Variable                              | Description                                                                                  |
| ------------------------------------- | -------------------------------------------------------------------------------------------- |
| `STRIPE_WEBHOOK_SIGNING_SECRET_LIVE`  | The Stripe webhook signing secret for the live environment.                                  |
| `STRIPE_WEBHOOK_SIGNING_SECRET_TEST`  | The Stripe webhook signing secret for the test environment.                                  |
| `STRIPE_PRODUCT_ID_LIVE`              | The Stripe product id for the live environment.                                              |
| `STRIPE_PRODUCT_ID_TEST`              | The Stripe product id for the test environment.                                              |
| `STRIPE_PUBLISHABLE_KEY_LIVE`         | The Stripe publishable key for the live environment.                                         |
| `STRIPE_PUBLISHABLE_KEY_TEST`         | The Stripe publishable key for the test environment.                                         |
| `STRIPE_SECRET_KEY_LIVE`              | The Stripe API secret key for the live environment.                                          |
| `STRIPE_SECRET_KEY_TEST`              | The Stripe API secret key for the test environment.                                          |
| `ROOT_COLLECTION_MODULE_KEY`          | The collection module unique key.                                                            |
| `ROOT_API_KEY_LIVE`                   | The Root API key for the production environment.                                             |
| `ROOT_API_KEY_TEST`                   | The Root API key for the sandbox environment.                                                |
| `ROOT_BASE_URL_LIVE`                  | The Root API base URL the production environment.                                            |
| `ROOT_BASE_URL_TEST`                  | The Root API base URL the sandbox environment.                                               |


## How to deploy the template

Once your code has been merged into main, go to the [github repository](https://github.com/RootBank/collection-module-template_stripe)
and select [releases](TODO). Create a new release add the new version number e.g. v2.0.0.
The collection module will be pushed and published. 