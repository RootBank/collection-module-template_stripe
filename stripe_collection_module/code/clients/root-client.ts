import { RootSDKClient } from '@rootplatform/node-sdk';
import { getConfigService } from '../services/config-instance';

class RootClient {
  public SDK: RootSDKClient;

  constructor() {
    const config = getConfigService();
    this.SDK = new RootSDKClient(
      config.get('rootApiKey'),
      config.get('rootBaseUrl')
    );
  }
}

export default new RootClient();
