import Config from '../config';

export default class ModuleError extends Error {
  constructor(message: string, metadata?: Record<string, any>) {
    const metadataString = JSON.stringify(metadata);
    const stackTrace = new Error('Error').stack;
    const caller = stackTrace?.split('\n')[2].trim().split(' ')[1];
    super(
      `[${Config.env.environment} | ${caller}] ${message} ${metadataString}`,
    );
  }
}
