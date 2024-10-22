import { getApp } from './app';

export const deletePreviewChannel = async ({
  clientSlackSecret,
  channelName
}: any) => {
  const app = getApp(clientSlackSecret);

  try {
    // Find the channel by name
    const result = await app.client.conversations.list();
    const channel = result.channels?.find((c: any) => c.name === channelName);

    if (!channel?.id) {
      throw new Error(`Channel ${channelName} not found.`);
    }

    // Archive (delete) the channel
    return await app.client.conversations.archive({
      channel: channel.id,
    });
  } catch (error: any) {
    throw new Error(`Slack channel delete failed:`, error)
  }
};
