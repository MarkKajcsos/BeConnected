import { EventBridgeEvent, SQSHandler } from 'aws-lambda';
import {
  ClientData,
  CreateMomentMessageBody,
  FlowStartMessageBody,
} from './types';
import { Config } from 'sst/node/config';
import { triggerEvent } from './utils';

export const handler = async (
  event: EventBridgeEvent<'FlowStart', FlowStartMessageBody>
) => {
  const clients = getClients();
  const { nextDate } = event.detail;
  await sendFlowStartMessage(nextDate, clients);
};

const sendFlowStartMessage = async (nextDate: Date, clients: ClientData[]) => {
  const eventBusName = String(process.env.eventBusName);
  for (const client of clients) {
    const createMomentMessageBody: CreateMomentMessageBody = {
      nextDate,
      ...client,
    };
    await triggerEvent(
      createMomentMessageBody,
      'createMomentEvent',
      eventBusName
    );
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
