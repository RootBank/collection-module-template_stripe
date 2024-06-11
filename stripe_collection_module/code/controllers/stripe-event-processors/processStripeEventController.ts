import Config from '../../config';
import StripeClient from '../../clients/stripe-client';
import Logger from '../../utils/logger';
import ModuleError from '../../utils/error';
const stripeClient = new StripeClient();

const getInvoiceMetadataWithDelay = async (invoiceId: string) => {
  let retrievedInvoice = await stripeClient.stripeSDK.invoices.retrieve(
    invoiceId,
  );

  if (!retrievedInvoice.metadata?.associatedRootPaymentIds) {
    await new Promise((resolve) =>
      setTimeout(resolve, parseInt(Config.env.timeDelayInMilliseconds)),
    );

    Logger.info(
      `Retrieved invoice ${retrievedInvoice.id} does not have associatedRootPaymentIds. Retrying..`,
    );

    retrievedInvoice = await stripeClient.stripeSDK.invoices.retrieve(
      invoiceId,
    );

    if (!retrievedInvoice.metadata?.associatedRootPaymentIds) {
      throw new ModuleError(
        `No associatedRootPaymentIds found in the metadata of invoice ${retrievedInvoice.id}.`,
        {
          retrievedInvoice,
        },
      );
    }
  }

  return retrievedInvoice;
};

export default getInvoiceMetadataWithDelay;
