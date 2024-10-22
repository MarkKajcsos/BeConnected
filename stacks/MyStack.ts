import * as cdk from 'aws-cdk-lib';
import {
  Bucket,
  Cron,
  FunctionDefinition,
  StackContext,
  StaticSite,
  use,
  Api,
  EventBus,
} from 'sst/constructs';
import * as iam from 'aws-cdk-lib/aws-iam';

import ConfigStack from './ConfigStack';

export function MyStack({ stack, app }: StackContext) {
  const {
    SLACK_SIGNING_SECRET,
    SLACK_BOT_TOKEN,
    SLACK_CHANNEL_ID,
    UPLOAD_EXPIRES,
  } = use(ConfigStack);
  const bind = [
    SLACK_SIGNING_SECRET,
    SLACK_BOT_TOKEN,
    SLACK_CHANNEL_ID,
    UPLOAD_EXPIRES,
  ];

  // S3 Bucket setup
  const bucket = new Bucket(stack, 'my-beconnected-bucket', {
    cdk: {
      bucket: {
        autoDeleteObjects: true,
        removalPolicy: cdk.RemovalPolicy.DESTROY,
      },
    },
    cors: [
      {
        allowedHeaders: ['*'],
        allowedMethods: ['PUT'],
        allowedOrigins: ['*'],
      },
    ],
    notifications: {
      uploadNotification: {
        function: {
          handler: 'services/lambdas/process-upload.handler',
          permissions: ['s3'],
          bind,
        },
        events: ['object_created'],
      },
    },
  });
  bucket.attachPermissions([bucket, 's3']);

  // frontend
  const site = new StaticSite(stack, 'ViteSite', {
    path: 'frontend',
    buildCommand: 'pnpm run build',
    buildOutput: 'dist',
  });
  const siteUrl: string = app.local
    ? JSON.parse(require('fs').readFileSync('.sst/beconnected-ngrok.json'))
        .public_url
    : site.url;

  // EventBus setup
  const eventBus = new EventBus(stack, 'MyEventBus');

  const eventBusDefaultPermissions = [
    new iam.PolicyStatement({
      actions: ['events:PutEvents'],
      resources: [eventBus.eventBusArn],
    }),
  ];

  eventBus.addRules(stack, {
    flowStartRule: {
      pattern: { source: ['flowStartEvent'] },
      targets: {
        function: {
          handler: 'services/lambdas/flow-start.handler',
          environment: { eventBusName: eventBus.eventBusArn },
          permissions: eventBusDefaultPermissions,
        },
      },
    },
    createMomentRule: {
      pattern: { source: ['createMomentEvent'] },
      targets: {
        function: {
          handler: 'services/lambdas/create-moment.handler',
          environment: { eventBusName: eventBus.eventBusArn },
          permissions: eventBusDefaultPermissions,
        },
      },
    },
    channelUsersQueueUrlRule: {
      pattern: { source: ['channelUsersQueueUrlEvent'] },
      targets: {
        function: {
          handler: 'services/lambdas/channel-users.handler',
          environment: { eventBusName: eventBus.eventBusArn },
          permissions: eventBusDefaultPermissions,
        },
      },
    },
    uploadLinkRule: {
      pattern: { source: ['uploadLinkEvent'] },
      targets: {
        function: {
          handler: 'services/lambdas/upload-link.handler',
          environment: {
            eventBusName: eventBus.eventBusArn,
            bucketName: bucket.bucketName,
          },
          permissions: eventBusDefaultPermissions,
        },
      },
    },
    sendDmMessageRule: {
      pattern: { source: ['sendDmMessageEvent'] },
      targets: {
        function: {
          handler: 'services/lambdas/send-dm.handler',
          environment: {
            eventBusName: eventBus.eventBusArn,
            siteUrl,
          },
          permissions: eventBusDefaultPermissions,
        },
      },
    },
  });
  eventBus.bind(bind);
  eventBus.attachPermissions([bucket, 'events:PutEvents']);

  // Handler for cron job
  const dailyNotificationRuleName = `${app.stage}-daily-notification-rule`;
  const triggerMomentHandler: FunctionDefinition = {
    handler: 'services/lambdas/cron.handler',
    bind,
    environment: {
      cloudwatchRuleName: dailyNotificationRuleName,
      eventBusName: eventBus.eventBusArn,
    },
    permissions: '*',
  };

  // API to trigger capture now function
  const slackCommandsApi = new Api(stack, 'Api', {
    routes: {
      'POST /slack/capture-now': {
        function: {
          handler: 'services/lambdas/cron.handler',
          timeout: 15,
          bind,
          environment: {
            cloudwatchRuleName: dailyNotificationRuleName,
            eventBusName: eventBus.eventBusArn,
          },
          permissions: '*',
        },
      },
    },
    cors: {
      allowMethods: ['POST'],
      allowOrigins: ['*'],
    },
  });

  // Cron job to trigger moment handler
  new Cron(stack, 'Cron', {
    schedule: 'rate(1 minute)',
    cdk: { rule: { ruleName: dailyNotificationRuleName } },
    job: {
      function: triggerMomentHandler,
    },
  });

  // Print out some stack info
  stack.addOutputs({
    SiteUrl: siteUrl,
    SlackCommandAPI: slackCommandsApi.url,
    BucketName: bucket.bucketName,
    EventBridgeArnName: eventBus.eventBusArn,
  });
}
