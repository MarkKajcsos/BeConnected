import { EventBridgeEvent, SQSHandler } from 'aws-lambda';
import { sendDmMessage } from 'slack/sendDmMessage';
import { makeShortLinkText } from 'slack/utils';
import { SendDmMessageBody } from './types';

export const handler = async (event: EventBridgeEvent<'SendDmMessage', SendDmMessageBody>) => {
  const siteUrl = String(process.env.siteUrl);

  const appUrl = `${siteUrl}?uploadUrl=${encodeURIComponent(
    event.detail.uploadLink
  )}`;

  console.log(`===sendDmHandler: siteUrl: ${siteUrl}`)
  console.log(`===sendDmHandler: appUrl: ${appUrl}`)

  const messageHeader = `, it is time to share your moment.`;
  const message = `Upload your moment: ${makeShortLinkText(appUrl, 'here.')}`;

  await sendDmMessage({ ...event.detail, message, messageHeader });
};
