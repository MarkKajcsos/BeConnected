import { getApp } from './app';
import { generateMessage } from './utils';

export type SendImageInThreadParams = {
  clientSlackSecret: string;
  userId: string;
  channelId: string;
  threadTs: string;
  messageHeader: string;
  imageUrl: string;
};

export const sendImageInReplyMessage = async ({
  clientSlackSecret,
  userId,
  channelId,
  threadTs,
  messageHeader,
  imageUrl,
}: SendImageInThreadParams) => {
  const app = getApp(clientSlackSecret);

  return app.client.chat.postMessage({
    mrkdwn: true,
    channel: channelId,
    thread_ts: threadTs,
    blocks: generateMessage(
      userId,
      imageUrl,
      undefined,
      undefined,
      messageHeader
    ).blocks,
  });
};
