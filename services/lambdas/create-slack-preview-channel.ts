import { createPreviewChannel } from "slack/createPreviewChannel";
import { PreviewChannelMessageBody } from "./types";


exports.handler = async (event: PreviewChannelMessageBody) => {
  try {
    const channelName = `pr-${event.prNumber}-preview`
    const response = await createPreviewChannel({...event, channelName})

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: `Slack channel created: ${response.channel ? response.channel.name : ''}`,
      }),
    };
  } catch (error: any) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: `Slack channel creation failed. ${error?.message ? `Error: ${error.message}` : ''}` }),
    };
  }
};
