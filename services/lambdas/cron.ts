import { CloudWatchEvents } from 'aws-sdk';
import {
  convertDateToCronExpression,
  getNextNotificationDate,
} from 'domain/scheduler';
import { triggerEvent } from './utils';

export const handler = async () => {
  const eventBusName = String(process.env.eventBusName);
  const nextDate = await scheduleNextNotification();
  await triggerEvent({ nextDate }, 'flowStartEvent', eventBusName);
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
