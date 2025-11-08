/**
 * RenderService - Handles HTML rendering for dashboard views
 *
 * This service consolidates all HTML rendering logic used by lifecycle hooks
 * to display UI elements on the Root dashboard.
 */

export interface RenderPaymentMethodParams {
  stripePublishableKey: string;
  setupIntentClientSecret: string;
}

export interface ViewPaymentMethodParams {
  payment_method: {
    collection_module_key: string;
    module: {
      id: string;
      payment_method: string;
      livemode: boolean;
      status: string;
      usage: string;
    };
  };
  policy: {
    billing_day: number;
  };
}

export interface ViewPaymentMethodSummaryParams {
  payment_method: {
    module: {
      payment_method: string;
    };
  };
  paymentMethodDetails?: {
    card?: {
      brand: string;
      last4: string;
      exp_month: number;
      exp_year: number;
    };
  };
}

export class RenderService {
  /**
   * Common CSS styles used across all renders
   */
  private readonly commonStyles = `
    .api-attributes {
      font-size: 9px;
    }
    .api-attributes-wrapper {
      display: none;
    }
  `;

  /**
   * Render the payment method creation form with Stripe Elements
   *
   * This creates a form that allows users to enter their payment details.
   * Uses Stripe Elements for PCI compliance.
   */
  renderCreatePaymentMethod(params: RenderPaymentMethodParams): string {
    const { stripePublishableKey, setupIntentClientSecret } = params;

    return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <script src="https://js.stripe.com/v3/"></script>
    <style>
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

      ${this.commonStyles}

      #card-errors {
        color: red;
        margin-top: 10px;
      }

      .loading-button {
        background-color: grey;
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
      // Initialize Stripe
      const stripe = Stripe('${this.escapeJs(
        stripePublishableKey
      )}', { locale: 'en-ZA' });
      const elements = stripe.elements({ clientSecret: '${this.escapeJs(
        setupIntentClientSecret
      )}' });

      // Create Payment Element
      const paymentElement = elements.create('payment', {
        hidePostalCode: true,
      });
      paymentElement.mount('#payment-element');

      // Handle payment element changes
      paymentElement.on('change', (event) => {
        if (!event.complete) {
          setIsValid(false);
        } else {
          setIsValid(true);
        }
      });

      // Submit payment method
      const submitRenderPaymentMethod = () => {
        setIsLoading(true);
        stripe
          .confirmSetup({
            elements,
            redirect: 'if_required',
          })
          .then(function (result) {
            if (result.error) {
              setIsLoading(false);
              return document.getElementById('card-errors').textContent = result.error.message;
            }
            return completeRenderPaymentMethod(result);
          });
      };
    </script>
  </body>
</html>`;
  }

  /**
   * Render payment method summary view (compact card view)
   *
   * Displays a brief summary of the payment method, typically used in lists.
   */
  renderViewPaymentMethodSummary(
    params: ViewPaymentMethodSummaryParams
  ): string {
    const { paymentMethodDetails } = params;

    const brand = paymentMethodDetails?.card?.brand || 'Unknown';
    const last4 = paymentMethodDetails?.card?.last4 || 'Unknown';
    const expMonth = paymentMethodDetails?.card?.exp_month || 'Unknown';
    const expYear = paymentMethodDetails?.card?.exp_year || 'Unknown';

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <script src="https://js.stripe.com/v3/"></script>
    <style>
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
          font-size: 16px;
        }

        ${this.commonStyles}
    </style>
</head>
<body>
    <div id="payment-details">
        <h3>Stripe payment method</h3>
        <div id="card-details">
            Card: ${this.escapeHtml(brand)} **** **** **** ${this.escapeHtml(
              last4
            )}, 
            Expires: ${this.escapeHtml(String(expMonth))}/${this.escapeHtml(
              String(expYear)
            )}
        </div>
    </div>
</body>
</html>`;
  }

  /**
   * Render full payment method details view
   *
   * Displays comprehensive information about the payment method.
   */
  renderViewPaymentMethod(params: ViewPaymentMethodParams): string {
    const { payment_method: paymentMethod, policy } = params;

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Payment Method Details</title>
  <style>
      body {
        font-family: 'Lato', sans-serif;
        font-size: 14px;
        color: rgb(61, 61, 61);
        margin: 0px;
        padding: 0px;
        height: 100%;
        margin-bottom: -30px;
      }
      .stripe-logo {
        height: 61px;
        width: 60px;
        float: right;
      }
      table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 0px;
          table-layout: fixed;
      }
      th, td {
          padding: 8px;
          text-align: left;
          width: 50%;
      }
      td.key {
          font-family: monospace;
          color: blue;
      }
      table, th, td {
          border: none;
      }
      ${this.commonStyles}
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
        <td class="key">${this.escapeHtml(
          paymentMethod.collection_module_key
        )}</td>
    </tr>
    <tr>
        <th>Id</th>
        <td>${this.escapeHtml(paymentMethod.module.id)}</td>
    </tr>
    <tr>
        <th>Payment method</th>
        <td>${this.escapeHtml(paymentMethod.module.payment_method)}</td>
    </tr>
    <tr>
        <th>Billing day</th>
        <td>${this.escapeHtml(String(policy.billing_day))}</td>
    </tr>
    <tr>
        <th>Livemode</th>
        <td>${this.escapeHtml(String(paymentMethod.module.livemode))}</td>
    </tr>
    <tr>
        <th>Status</th>
        <td>${this.escapeHtml(paymentMethod.module.status)}</td>
    </tr>
    <tr>
        <th>Usage</th>
        <td>${this.escapeHtml(paymentMethod.module.usage)}</td>
    </tr>
</table>
<img class='stripe-logo' src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAIAAAABVCAYAAACBzexXAAAAAXNSR0IArs4c6QAABXRJREFUeF7tnF1SGzEMgNdJjtCLJDCdvgHnaOEqba4CvUKfgccyDBygZ+gRYDuKo1nvYlv+28obi5cyXVbWz2dZsp2oTn6a9oBq2noxvhMAGodAABAAGvdA4+ZLBhAAGvdA4+ZLBhAAGvdA4+ZLBhAAGvdA4+ZLBhAAGvdA4+ZLBhAAGvdA4+ZLBhAAGvdA4+ZLBhAAGvdA4+ZLBhAAGvdA13Xn598u399Xl33fX7y+3l215JEmMwAE/O1NfYdAK9VdmgF/eblryidNGYuB3m6v76eBx2cCQCX5D9PyavX+8Pz886GkWgLA4M1qMsBud/NDq9UfUjP+rFb9lQBQEv+xrCoA0MEfB54DgL7vHqQInA82p2QuACDgSqnHOZYZBjcmDdlkBoD6ovSykuT9Cl5qEoA5/D4HVHPInNpeFABff23UnXv4/eXl9lj0dZ1vCYA0PVV6ve73MIPN8cy/gbQO8j8WlmoP/392dv3LBcF6rW6enm7/UrLhfZveoC/qFwsajmlvUdUHv8XKt/19EQD8itvVNAsuHwC2t7EzcL+nnfWxsNQAbLfXv5XqPttkbzbqEwDg1wnk24tWlBkDQpz/tA0lgg8ysgHQ/bq6j1VoXgBc2pQCIMZaf8Bi4T9gXbBbyQZgt7vuY9xhzhBsuWKdQGeAmgDoOtdeRqzdplWlIMgCoJQBsXKWBoArWKmTB0EosUmWBYBvSxVT1WGdmRy4TNPYqQOgAzZeCmibsY6x1TLHCqfAUpAFgI9g26GKWZWH1gA+ymknascPM0afK+QXgeOA4rmFvzCcAmBfOm3ZYs6NsmQAfMVfyPpk9bipBlLto2tbNx8Ae2FHAYmTguowbFW+K9uG+NpXoyUDAEL9a1h4uzIHAL7MMRcAlE9CahfXcbRrwrECQNUAuPbBv77e9bQAcB9sYR3gmji4d2CbsXBjybXE5NxhyMwAPmNtZsSnztQagCsD+PdFtP251f/Us2wAgCJhWWCqcnhFLADQuyw57WBWBkDVqOLHbsIAwSktAb46ANfr0hmAHQBttP1Gj4/fkKJIMsACMoCpYlhPPN7IOKUMkFsD2E4/KQRSTx8PuxmU8Jzn1NIwpMS0K2Gp4MzZBvpqIsxmNV1KnRUAgIc6LYQKNjWQqe/NBQBlawgAOet5ymTNAkAXM/RFBWrLOGVnbKg74i+TzgUA1RFhuxYKii+gIAOe515tKwCAqeZ43x2ewCdwXB/CCFkCQIa5QQIbIniJky8DaJ0Oa6hSj8eKZnSdfRq86Y4dBQtMLPOyKgYcP8IGPs3dBcyuAfLbGd0KUjNi6szc7iE/A8Qn22lqj7XZNuLJAODrnW2GLw8A+w4onQX8oC0cgPDdwCVnACpIORBQskPyVOEaIGTIw8pjvdhItY0ofSkZIDRAoXZTdUWo90dVW8pL+E7s7l/ITdmQtZEfALWH7xJwFbfaP+HH4VRHYwt8zuZPMQBMQcMO4LEm7vsLrJKhmoXfY1oW80sbhkp7fKyMlbENYt9au93XLy7wN5v1n5Br4Vi8gpzhuwZ0R5B7bXuYWNBtAGhaboofqQmetQRQwpf8PHVvYmk2CwCOiAkAS0O5sL4CQGGHLk2cALC0iBXWVwAo7NCliUs9Z1ianVIEEkUgfotIifauRjgEAEdU/seXM9QAhABQQxQYdRAAGJ1fw9ACQA1RYNRBAGB0fg1DCwA1RIFRBwGA0fk1DC0A1BAFRh0EAEbn1zC0AFBDFBh1EEAYHR+DUMLADVEgVEHAYDR+TUMLQDUEAVGHQQARufXMLQAUEMUGHUQABidX8PQAkANUWDUQQBgdH4NQwsANUSBUYd/I+IwoYDYcegAAAAASUVORK5CYII=" />
</body>
</html>`;
  }

  /**
   * Escape HTML to prevent XSS
   */
  private escapeHtml(text: string): string {
    const map: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;',
    };
    return text.replaceAll(/[&<>"']/g, (m) => map[m]);
  }

  /**
   * Escape JavaScript strings for safe embedding in HTML
   */
  private escapeJs(text: string): string {
    return text
      .replaceAll('\\', '\\\\')
      .replaceAll("'", String.raw`\'`)
      .replaceAll('"', String.raw`\"`)
      .replaceAll('\n', String.raw`\n`)
      .replaceAll('\r', String.raw`\r`)
      .replaceAll('\t', String.raw`\t`);
  }
}
