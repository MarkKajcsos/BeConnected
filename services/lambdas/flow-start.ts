import { EventBridgeEvent, SQSHandler } from 'aws-lambda';
import { EventBridge, SQS } from 'aws-sdk';
import {
  ClientData,
  CreateMomentMessageBody,
  FlowStartMessageBody,
} from './types';
import { Config } from 'sst/node/config';

export const handler = async (event: EventBridgeEvent<'FlowStart', FlowStartMessageBody>) => {
  const clients = getClients();
  const { nextDate } = event.detail
  await sendFlowStartMessage(nextDate, clients);
};

const sendFlowStartMessage = async (nextDate: Date, clients: ClientData[]) => {
  const eventBusName = String(process.env.eventBusName)

  for (const client of clients) {
    const createMomentMessageBody: CreateMomentMessageBody = {
      nextDate,
      ...client,
    };
    const eventBridge = new EventBridge();
    const params = {
      Entries: [
        {
          Source: 'createMomentEvent',
          DetailType: 'createMomentEventTriggered',
          Detail: JSON.stringify(createMomentMessageBody),
          EventBusName: eventBusName,
        },
      ],
    };
    const result = await eventBridge.putEvents(params).promise();
    console.log('Event triggered successfully:', result);




  }
};

const getClients = (): ClientData[] => {
  return [
    {
      clientName: 'Apex Lab',
      clientSlackSecret: Config.SLACK_SIGNING_SECRET,
      clientChannelId: Config.SLACK_CHANNEL_ID,
    },
  ];
};
function CreateMomentEventDetail(this: any, key: string, value: any) {
  throw new Error('Function not implemented.');
}

