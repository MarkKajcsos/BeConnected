import { EventBridgeEvent, SQSHandler } from 'aws-lambda';
import { getSlackChannelUsers } from 'slack/getChannelUsers';
import { ChannelUsersMessageBody, UploadLinkMessageBody } from './types';
import { triggerEvent } from './utils';

export const handler = async (event: EventBridgeEvent<'ChannelUsers', ChannelUsersMessageBody>) => {
    const users = await getChannelUsers(event.detail);
    await triggerEvents(users)
};

const getChannelUsers = async (
  recordBody: ChannelUsersMessageBody
): Promise<UploadLinkMessageBody[]> => {
  const userIds = await getSlackChannelUsers(recordBody);

  return userIds.map((userId) => ({
    ...recordBody,
    userId,
  }));
};

const triggerEvents = async (users: UploadLinkMessageBody[]) => {
  const eventBusName = String(process.env.eventBusName)
  for (const user of users) {
    // TODO: make it parallel
    await triggerEvent(user, 'uploadLinkEvent', eventBusName)

  }
};
