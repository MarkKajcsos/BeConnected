import { EventBridgeEvent } from 'aws-lambda';
import { createThread } from '../slack/createThread';
import { ChannelUsersMessageBody, CreateMomentMessageBody } from './types';
import { EventBridge } from 'aws-sdk';

export const handler = async (event: EventBridgeEvent<'CreateMoment', CreateMomentMessageBody>) => {
  if(event.detail) {
    const messageBody = await createMoment(event.detail);
    await triggerEvent(messageBody)
  }
};

const createMoment = async (recordBody: CreateMomentMessageBody): Promise<ChannelUsersMessageBody> => {
  const response = await createThread(recordBody);
  if (!response || !response.ok || !response.ts) {
    throw new Error('Error creating message thread');
  }
  return { ...recordBody, threadId: response.ts };
};

const triggerEvent = async (messageBody: ChannelUsersMessageBody) => {
  const eventBusName = String(process.env.eventBusName)
  const eventBridge = new EventBridge();
  const params = {
    Entries: [
      {
        Source: 'channelUsersQueueUrlEvent',
        DetailType: 'channelUsersQueueUrlEventTriggered',
        Detail: JSON.stringify(messageBody),
        EventBusName: eventBusName,
      },
    ],
  };
  // Put the event to EventBridge
  const result = await eventBridge.putEvents(params).promise();
}
