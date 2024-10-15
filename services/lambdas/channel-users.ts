import { EventBridgeEvent, SQSHandler } from 'aws-lambda';
import { EventBridge, SQS } from 'aws-sdk';
import { getSlackChannelUsers } from 'slack/getChannelUsers';
import { ChannelUsersMessageBody, UploadLinkMessageBody } from './types';

export const handler = async (event: EventBridgeEvent<'CreateMoment', ChannelUsersMessageBody>) => {
  const users = await getChannelUsers(event.detail);
  await triggerEvent(users);
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

const triggerEvent = async (users: UploadLinkMessageBody[]) => {
  const eventBusName = String(process.env.eventBusName)
  const eventBridge = new EventBridge();
  for (const user of users) {
    const params = {
      Entries: [
        {
          Source: 'uploadLinkEvent',
          DetailType: 'uploadLinkEventTriggered',
          Detail: JSON.stringify(user),
          EventBusName: eventBusName,
        },
      ],
    };
    await eventBridge.putEvents(params).promise();
  }
};