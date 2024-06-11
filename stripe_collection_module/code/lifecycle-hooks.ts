import ProcessCreatePaymentEventController from './controllers/root-event-processors/processCreatePaymentEventController';
import ProcessPolicyPaymentMethodAssignedEventController from './controllers/root-event-processors/processPolicyPaymentMethodAssignedEventController';
import ProcessPolicyAlterationEventsController from './controllers/root-event-processors/processPolicyAlterationEventsController';
import ProcessPolicyCancellationEventsController from './controllers/root-event-processors/processPolicyCancellationEventsController';
import Stripe from 'stripe';

import * as root from '@rootplatform/node-sdk';
import StripeClient from './clients/stripe-client';
import Config from './config';
import { ProcessPolicyUpdatedEventController } from './controllers/root-event-processors/processPolicyUpdatedEventController';
import Logger from './utils/logger';
import ModuleError from './utils/error';

const RootSupportedEvent = {
  PaymentMethodAssigned: 'payment_method_assigned',
  PaymentCreated: 'payment_created',
  PaymentMethodRemoved: 'payment_method_removed',
  PolicyAlterationPackageApplied: 'policy_alteration_package_applied',
  PolicyCancelled: 'policy_cancelled',
  PolicyExpired: 'policy_expired',
  PolicyLapsed: 'policy_lapsed',
  PolicyUpdated: 'policy_updated',
};

const stripeClient = new StripeClient();

export const afterPolicyIssued = () => {};

export const createPaymentMethod = ({
  data,
}: {
  data?: { setupIntent?: Stripe.SetupIntent };
}) => {
  if (data?.setupIntent) {
    return {
      module: {
        id: data.setupIntent.id,
        usage: data.setupIntent.usage,
        object: data.setupIntent.object,
        status: data.setupIntent.status,
        livemode: data.setupIntent.livemode,
        payment_method: data.setupIntent.payment_method,
      },
    };
  }

  return {
    module: data,
  };
};

export const renderCreatePaymentMethod = async () => {
  const publicKey = Config.env.stripePublishableKey;

  let intentSecretKey = '';
  try {
    const setupIntent = await stripeClient.stripeSDK.setupIntents.create({});
    intentSecretKey = setupIntent.client_secret!;
  } catch (error) {
    throw new ModuleError(`Error creating setup intent`);
  }

  return `<!DOCTYPE html>
  <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <script src="https://js.stripe.com/v3/"></script>
      <style>
        /* General form styling */
        body {
          font-family: 'Arial', sans-serif;
        }
 
        #payment-form {
          width: 100%;
          max-width: 100%;
        }
 
        .form-row {
          margin-bottom: 20px;
        }
 
        label {
          display: block;
          margin-bottom: 10px;
        }
 
        button {
          background-color: #32325d;
          color: white;
          padding: 10px 15px;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          transition: background-color 0.3s ease;
        }
 
        button:hover {
          background-color: #43458b;
        }

        .api-attributes {
          font-size: 9px;
        }

        .api-attributes-wrapper {
          display: none
        }
 
        #card-errors {
          color: red;
          margin-top: 10px;
        }
 
        .loading-button {
          background-color: grey; /* or any loading indication color */
          cursor: not-allowed;
        }
      </style>
    </head>
    <body>
      <form action="/charge" method="post" id="payment-form">
        <div class="form-row">
          <div id="payment-element"></div>
        </div>
      </form>
      <script>
        // Initialization
        const stripe = Stripe('${publicKey}', { locale: 'en-ZA' }); // Replace with your key
        const elements = stripe.elements({ clientSecret: '${intentSecretKey}' }); // Replace with your client secret
 
        // Create Payment Element with styling
        const paymentElement = elements.create('payment', {
          hidePostalCode: true,
        });
        paymentElement.mount('#payment-element');
 
        // Handle changes to the Payment Element
        paymentElement.on('change', (event) => {
          if (!event.complete) {
            setIsValid(false);
          } else {
            setIsValid(true);
          }
        });
 
        const submitRenderPaymentMethod = () => {
          setIsLoading(true);
          stripe
            .confirmSetup({
              elements,
              redirect: 'if_required',
            })
            .then(function (result) {
              if (result.error) {
                // Show error to your customer
                setIsLoading(false);
                return document.getElementById('card-errors').textContent = result.error.message;
              }
               
              return completeRenderPaymentMethod(result);
            });
        };
      </script>
    </body>
  </html>
  `;
};

export const renderViewPaymentMethodSummary = async (params: {
  payment_method: any;
}) => {
  const { payment_method } = params;

  const paymentMethodDetails = await stripeClient.stripeSDK.paymentMethods
    .retrieve(payment_method?.module?.payment_method as string)
    .catch((error) => {
      throw new ModuleError(
        `Error retrieving payment method: ${error.message}`,
      );
    });

  return `<!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <script src="https://js.stripe.com/v3/"></script>
        <style>
            /* Add your CSS styling here */
            body {
                font-family: Arial, sans-serif;
                margin-bottom: 0px !important;
                margin: 0px;
            }
            #payment-details {
                background-color: white;
                border-radius: 8px;
                cursor: pointer;
            }
            #card-details {
                margin-top: 10px;
                padding-top: 5px;
                background-color: white;
                border-radius: 4px;
                font-size: 14px;
                color: rgba(0, 0, 0, 0.6);
                cursor: pointer;
                margin-bottom: 24px;
            }
            h3 {
              font-size: 16px
            }

            .api-attributes {
              font-size: 9px;
            }
   
            .api-attributes-wrapper {
              display: none;
            }
        </style>
      </head>
      <body>
          <div id="payment-details">
              <h3>Stripe payment method</h3>
              <div id="card-details">
              Card: ${
                paymentMethodDetails.card?.brand || 'Unknown'
              } **** **** **** ${
    paymentMethodDetails.card?.last4 || 'Unknown'
  }, Expires: ${paymentMethodDetails.card?.exp_month || 'Unknown'}/${
    paymentMethodDetails.card?.exp_year || 'Unknown'
  }
          </div>
          </div>
      </body>
    </html>`;
};

export const renderViewPaymentMethod = async (params: any) => {
  const { payment_method, policy } = params;

  return `<!DOCTYPE html>
  <html lang="en">
  <head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Simple Table</title>
  <style>
      body {
        font-family: 'Lato', sans-serif;
        font-size: 14px;
        color: rgb(61, 61, 61);
        margin: 0px;
        padding: 0px;
        height: 100%
        margin-bottom: -30px;
      }
      .stripe-logo {
        height: 61px;
        height: 60px;
        float: right;
      }
      table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 0px;
          table-layout: fixed; /* Ensures each column is of equal width */
      }
      th, td {
          padding: 8px;
          text-align: left;
          width: 50%; /* Sets each column to 50% width */
      }
      th {

      }
      td.key {
          font-family: monospace;
          color: blue;
      }
      /* Remove all borders from table, th, and td */
      table, th, td {
          border: none;
      }
  </style>
  </head>
  <body>
  <table>
      <tr>
          <th>Type</th>
          <td>Collection module</td>
      </tr>
      <tr>
          <th class="no-background">Key</th>
          <td class="key">${payment_method.collection_module_key}</td>
      </tr>
      <tr>
          <th>Id</th>
          <td>${payment_method.module.id}</td>
      </tr>
      <tr>
          <th>Payment method</th>
          <td>${payment_method.module.payment_method}</td>
      </tr>
      <tr>
          <th>Billing day</th>
          <td>${policy.billing_day}</td>
      </tr>
      <tr>
          <th>Livemode</th>
          <td>${payment_method.module.livemode}</td>
      </tr>
      <tr>
          <th>Status</th>
          <td>${payment_method.module.status}</td>
      </tr>
      <tr>
          <th>Usage</th>
          <td>${payment_method.module.usage}</td>
      </tr>
  </table>
  <img class='stripe-logo' src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAIAAAABVCAYAAACBzexXAAAAAXNSR0IArs4c6QAABXRJREFUeF7tnF1SGzEMgNdJjtCLJDCdvgHnaOEqba4CvUKfgccyDBygZ+gRYDuKo1nvYlv+28obi5cyXVbWz2dZsp2oTn6a9oBq2noxvhMAGodAABAAGvdA4+ZLBhAAGvdA4+ZLBhAAGvdA4+ZLBhAAGvdA4+ZLBhAAGvdA4+ZLBhAAGvdA4+ZLBhAAGvdA4+ZLBhAAGvdA4+ZLBhAAGvdA4+ZLBhAAGvdA13Xn598u399Xl33fX7y+3l215JEmMwAE/O1NfYdAK9VdmgF/eblryidNGYuB3m6v76eBx2cCQCX5D9PyavX+8Pz886GkWgLA4M1qMsBud/NDq9UfUjP+rFb9lQBQEv+xrCoA0MEfB54DgL7vHqQInA82p2QuACDgSqnHOZYZBjcmDdlkBoD6ovSykuT9Cl5qEoA5/D4HVHPInNpeFABff23UnXv4/eXl9lj0dZ1vCYA0PVV6ve73MIPN8cy/gbQO8j8WlmoP/392dv3LBcF6rW6enm7/UrLhfZveoC/qFwsajmlvUdUHv8XKt/19EQD8itvVNAsuHwC2t7EzcL+nnfWxsNQAbLfXv5XqPttkbzbqEwDg1wnk24tWlBkDQpz/tA0lgg8ysgHQ/bq6j1VoXgBc2pQCIMZaf8Bi4T9gXbBbyQZgt7vuY9xhzhBsuWKdQGeAmgDoOtdeRqzdplWlIMgCoJQBsXKWBoArWKmTB0EosUmWBYBvSxVT1WGdmRy4TNPYqQOgAzZeCmibsY6x1TLHCqfAUpAFgI9g26GKWZWH1gA+ymknascPM0afK+QXgeOA4rmFvzCcAmBfOm3ZYs6NsmQAfMVfyPpk9ripBlLto2tbNx8Ae2FHAYmTguowbFW+K9uG+NpXoyUDAEL9a1h4uzIHAL7MMRcAlE9CahfXcbRrwrECQNUAuPbBv77e9bQAcB9sYR3gmji4d2CbsXBjybXE5NxhyMwAPmNtZsSnztQagCsD+PdFtP251f/Us2wAgCJhWWCqcnhFLADQuyw57WBWBkDVqOLHbsIAwSktAb46ANfr0hmAHQBttP1Gj4/fkKJIMsACMoCpYlhPPN7IOKUMkFsD2E4/KQRSTx8PuxmU8Jzn1NIwpMS0K2Gp4MzZBvpqIsxmNV1KnRUAgIc6LYQKNjWQqe/NBQBlawgAOet5ymTNAkAXM/RFBWrLOGVnbKg74i+TzgUA1RFhuxYKii+gIAOe515tKwCAqeZ43x2ewCdwXB/CCFkCQIa5QQIbIniJky8DaJ0Oa6hSj8eKZnSdfRq86Y4dBQtMLPOyKgYcP8IGPs3dBcyuAfLbGd0KUjNi6szc7iE/A8Qn22lqj7XZNuLJAODrnW2GLw8A+w4onQX8oC0cgPDdwCVnACpIORBQskPyVOEaIGTIw8pjvdhItY0ofSkZIDRAoXZTdUWo90dVW8pL+E7s7l/ITdmQtZEfALWH7xJwFbfaP+HH4VRHYwt8zuZPMQBMQcMO4LEm7vsLrJKhmoXfY1oW80sbhkp7fKyMlbENYt9Yu93XLy7wN5v1n5Br4Vi8gpzhuwZ0R5B7bXuYWNBtAGhaboofqQmetQRQwpf8PHVvYmk2CwCOiAkAS0O5sL4CQGGHLk2cALC0iBXWVwAo7NCliUs9Z1ianVIEEkUgfotIifauRjgEAEdU/seXM9QAhABQQxQYdRAAGJ1fw9ACQA1RYNRBAGB0fg1DCwA1RIFRBwGA0fk1DC0A1BAFRh0EAEbn1zC0AFBDFBh1EAAYnV/D0AJADVFg1EEAYHR+DUMLADVEgVEHAYDR+TUMLQDUEAVGHQQARufXMLQAUEMUGHUQABidX8PQAkANUWDUQQBgdH4NQwsANUSBUYd/I+IwoYDYcegAAAAASUVORK5CYII=" />
  </body>
  </html>`;
};

export const afterPolicyPaymentMethodAssigned = async ({
  policy,
}: {
  policy: root.Policy;
}) => {
  Logger.info(`start`, {
    policy,
  });

  await new ProcessPolicyPaymentMethodAssignedEventController().process({
    policy,
  });

  Logger.info(`complete`, {
    policy,
  });
};

export const afterPaymentCreated = async ({
  policy,
  payment,
}: {
  policy: root.Policy;
  payment: any;
}) => {
  Logger.info(`start`, {
    policy,
  });

  await new ProcessCreatePaymentEventController().process({
    rootPaymentId: payment.payment_id,
    rootPolicyId: policy.policy_id,
    amount: payment.amount,
    description: payment.description,
    status: payment.status,
    stripePaymentMethodId: payment.stripe_payment_method_id,
  });

  Logger.info(`complete`, {
    policy,
  });
};

export function afterPaymentUpdated({
  policy,
  payment,
}: {
  policy: root.Policy;
  payment: root.PaymentMethod;
}) {
  Logger.info(`start`, {
    policy,
    payment,
  });

  // Not implemented

  Logger.info(`complete`, {
    policy,
    payment,
  });
}

export const afterPaymentMethodRemoved = async ({
  policy,
}: {
  policy: root.Policy;
}) => {
  Logger.info(`start`, {
    policy,
  });

  await new ProcessPolicyCancellationEventsController().process(
    policy.policy_id,
    RootSupportedEvent.PaymentMethodRemoved,
  );

  Logger.info(`complete`, {
    policy,
  });
};

export const afterPolicyCancelled = async ({
  policy,
}: {
  policy: root.Policy;
}) => {
  Logger.info(`start`, {
    policy,
  });

  await new ProcessPolicyCancellationEventsController().process(
    policy.policy_id,
    RootSupportedEvent.PolicyCancelled,
  );

  Logger.info(`complete`, {
    policy,
  });
};

export const afterPolicyExpired = async ({
  policy,
}: {
  policy: root.Policy;
}) => {
  Logger.info(`start`, {
    policy,
  });

  await new ProcessPolicyCancellationEventsController().process(
    policy.policy_id,
    RootSupportedEvent.PolicyExpired,
  );

  Logger.info(`complete`, {
    policy,
  });
};

export const afterPolicyLapsed = async ({
  policy,
}: {
  policy: root.Policy;
}) => {
  Logger.info(`start`, {
    policy,
  });

  await new ProcessPolicyCancellationEventsController().process(
    policy.policy_id,
    RootSupportedEvent.PolicyLapsed,
  );

  Logger.info(`complete`, {
    policy,
  });
};

export const afterPolicyUpdated = async ({
  policy,
  updates,
}: {
  policy: root.Policy;
  updates: any;
}) => {
  Logger.info('start', {
    policy,
    updates,
  });

  await new ProcessPolicyUpdatedEventController().process({
    rootPolicyId: policy.policy_id,
    updates,
  });

  Logger.info('complete', {
    policy,
    updates,
  });
};

export const afterAlterationPackageApplied = async ({
  policy,
  alteration_package,
  alteration_hook_key,
}: {
  policy: root.Policy;
  alteration_package: any;
  alteration_hook_key: string;
}) => {
  Logger.info(`start`, {
    policy,
    alteration_package,
    alteration_hook_key,
  });

  await new ProcessPolicyAlterationEventsController().process({
    rootPolicyId: policy.policy_id,
    updatedMonthlyPremiumAmount: policy.monthly_premium,
    currency: policy.currency,
    billingFrequency: policy.billing_frequency as
      | 'monthly'
      | 'yearly'
      | 'once_off',
    rootPolicyStartDate: policy.start_date,
    rootPolicyEndDate: policy.end_date,
    billingDay: policy.billing_day,
    policyAppData: policy.app_data,
    alterationHookKey: alteration_hook_key,
    alterationPackage: alteration_package,
  });

  Logger.info(`complete`, {
    policy,
    alteration_package,
    alteration_hook_key,
  });
};
