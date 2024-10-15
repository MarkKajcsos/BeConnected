import { AWSError, EventBridge } from "aws-sdk";
import { PromiseResult } from "aws-sdk/lib/request";

export const triggerEvent = async <T>(messageBody: T, eventName: string, eventBusName: string):
Promise<PromiseResult<EventBridge.PutEventsResponse, AWSError>> => {
  const eventBridge = new EventBridge();
  console.log(`== triggerEvent: ${eventName} - ${JSON.stringify(messageBody)}`)
  const params = {
    Entries: [
      {
        Source: eventName,
        DetailType: `${eventName}Triggered`,
        Detail: JSON.stringify(messageBody),
        EventBusName: eventBusName,
      },
    ],
  };
  return await eventBridge.putEvents(params).promise();
}
