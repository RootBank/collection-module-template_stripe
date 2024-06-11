import { RootSDKClient } from '@rootplatform/node-sdk';
import Config from '../config';

class RootClient {
  public SDK: RootSDKClient;

  constructor() {
    this.SDK = new RootSDKClient(Config.env.rootApiKey, Config.env.rootBaseUrl);
  }
}

export default new RootClient();
