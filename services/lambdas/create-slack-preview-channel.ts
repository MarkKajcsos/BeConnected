import { PreviewChannelMessageBody } from "./types";

const { WebClient } = require('@slack/web-api');

exports.handler = async (event: PreviewChannelMessageBody) => {
  const slackToken = process.env.SLACK_BOT_TOKEN;
  const slackClient = new WebClient(slackToken);
  const prNumber = event.prNumber;

  try {
    const response = await slackClient.conversations.create({
      name: `pr-${prNumber}-preview`
    });

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: `Slack channel created: ${response.channel.name}`,
      }),
    };
  } catch (error: any) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: `Slack channel creation failed. ${error?.message ? `Error: ${error.message}` : ''}` }),
    };
  }
};
