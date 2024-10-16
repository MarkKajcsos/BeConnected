import { Config } from 'sst/node/config';
import { App, LogLevel } from '@slack/bolt';

export const getApp = (secret: string) => {
  const app = new App({
    signingSecret: secret ?? Config.SLACK_SIGNING_SECRET,
    token: Config.SLACK_BOT_TOKEN,
    logLevel: LogLevel.DEBUG,
  });
  return app;
};
