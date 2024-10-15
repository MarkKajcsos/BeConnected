import { CloudWatchEvents, EventBridge, SQS } from 'aws-sdk';
import {
  convertDateToCronExpression,
  getNextNotificationDate,
} from 'domain/scheduler';
import { FlowStartMessageBody } from './types';

export const handler = async () => {
  const nextDate = await scheduleNextNotification();
  await sendFlowStartMessage(nextDate);
};

const sendFlowStartMessage = async (nextDate: Date) => {
  // const flowStartQueueUrl = String(process.env.flowStartQueueUrl);
  // const queue = new SQS();
  const eventBusName = String(process.env.eventBusName)
  const flowStartMessageBody: FlowStartMessageBody = { nextDate };

  const eventBridge = new EventBridge();
  const params = {
    Entries: [
      {
        Source: 'flowStartEvent',
        DetailType: 'flowStartEventTriggered',
        Detail: JSON.stringify(flowStartMessageBody),
        EventBusName: eventBusName,
      },
    ],
  };
  const result = await eventBridge.putEvents(params).promise();
  console.log('Event triggered successfully:', result);

  // return queue
  //   .sendMessage({
  //     QueueUrl: flowStartQueueUrl,
  //     MessageBody: JSON.stringify(flowStartMessageBody),
  //   })
  //   .promise();
};

export const scheduleNextNotification = async (): Promise<Date> => {
  const cloudwatchevents = new CloudWatchEvents();

  const nextDate = getNextNotificationDate({});
  const scheduleExpression = convertDateToCronExpression(nextDate);

  await cloudwatchevents
    .putRule({
      Name: process.env.cloudwatchRuleName as string,
      ScheduleExpression: scheduleExpression,
    })
    .promise();
  return nextDate;
};
