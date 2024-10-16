import { EventBridgeEvent } from 'aws-lambda';
import { createThread } from '../slack/createThread';
import { ChannelUsersMessageBody, CreateMomentMessageBody } from './types';
import { triggerEvent } from './utils';

export const handler = async (
  event: EventBridgeEvent<'CreateMoment', CreateMomentMessageBody>
) => {
  const eventBusName = String(process.env.eventBusName);
  const messageBody = await createMoment(event.detail);
  await triggerEvent(messageBody, 'channelUsersQueueUrlEvent', eventBusName);
};

const createMoment = async (recordBody: CreateMomentMessageBody) => {
  const response = await createThread(recordBody);
  if (!response || !response.ok || !response.ts) {
    throw new Error('Error creating message thread');
  }
  return { ...recordBody, threadId: response.ts } as ChannelUsersMessageBody;
};
