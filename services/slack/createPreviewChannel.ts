import { getApp } from './app';

export const createPreviewChannel = async ({
  clientSlackSecret,
  channelName,
}: any) => {
  const app = getApp(clientSlackSecret);
  try {
    return await app.client.conversations.create({
      name: channelName,
    });
  } catch (error: any) {
    throw new Error(`Slack channel creation failed:`, error);
  }
};
