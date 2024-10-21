import { getApp } from './app';
import { ClientData } from '../lambdas/types';

export const createThread = async ({
  clientSlackSecret,
  clientChannelId,
  clientName
}: ClientData) => {
  const app = getApp(clientSlackSecret);

  return app.client.chat.postMessage({
    channel: clientChannelId,
    text: `${clientName} show me what you got! 📸`,
  });
};
