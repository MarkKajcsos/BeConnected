import { EventBridgeEvent, SQSHandler } from 'aws-lambda';
import { EventBridge, S3, SQS } from 'aws-sdk';
import { UploadLinkMessageBody, S3ImageMetaData, SendDmMessageBody } from './types';
import { triggerEvent } from './utils';

export const handler = async (event: EventBridgeEvent<'UploadLink', UploadLinkMessageBody>) => {
  const eventBusName = String(process.env.eventBusName)
  const messageBody = await createS3UploadLink(event.detail);
  await triggerEvent<SendDmMessageBody>(messageBody, 'sendDmMessageEvent', eventBusName)
};

const createS3UploadLink = async ({
  userId,
  threadId,
  clientSlackSecret,
  nextDate,
  clientChannelId,
}: UploadLinkMessageBody) => {
  const bucketName = String(process.env.bucketName);
  const s3 = new S3();
  const timestamp = Date.now().toString();

  const metaData: S3ImageMetaData = {
    userid: userId,
    threadid: threadId,
    clientslacksecret: clientSlackSecret,
    timestamp,
    clientchannelid: clientChannelId,
  };

  const expiryInSeconds = Math.floor((+new Date(nextDate) - Date.now()) / 1000);

  const uploadLink = await s3.getSignedUrlPromise('putObject', {
    Bucket: bucketName,
    Key: `${userId}/${timestamp}`,
    Expires: expiryInSeconds,
    ACL: 'public-read',
    ContentType: 'image/*',
    Metadata: metaData,
  });

  return { clientSlackSecret, userId, uploadLink } as SendDmMessageBody
};

// const triggerEvent = async (messageBody: SendDmMessageBody) => {
//   const eventBusName = String(process.env.eventBusName)
//   const eventBridge = new EventBridge();
//   const params = {
//     Entries: [
//       {
//         Source: 'sendDmMessageEvent',
//         DetailType: 'sendDmMessageEventTriggered',
//         Detail: JSON.stringify(messageBody),
//         EventBusName: eventBusName,
//       },
//     ],
//   };
//   const result = await eventBridge.putEvents(params).promise();
// }
