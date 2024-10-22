import { PreviewChannelMessageBody } from './types';
import { deletePreviewChannel } from 'slack/deletePreviewChannel';

exports.handler = async (event: PreviewChannelMessageBody) => {
  try {
    const channelName = `pr-${event.prNumber}-preview`;
    await deletePreviewChannel({ ...event, channelName });

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Slack channel archived',
      }),
    };
  } catch (error: any) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: `Slack channel creation failed. ${error?.message ? `Error: ${error.message}` : ''}`,
      }),
    };
  }
};
