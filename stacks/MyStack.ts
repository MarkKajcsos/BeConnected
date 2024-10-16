import * as cdk from 'aws-cdk-lib';
import {
  Bucket,
  Cron,
  FunctionDefinition,
  Queue,
  StackContext,
  StaticSite,
  use,
  Api,
  EventBus,
} from 'sst/constructs';
import * as iam from 'aws-cdk-lib/aws-iam';

import ConfigStack from './ConfigStack';

// TODO: move to .env or Config.secret
const EVENT_BUS_NAME = "arn:aws:events:eu-central-1:307946669175:event-bus/markkajcsos-apex-homework-Bus";

export function MyStack({ stack, app }: StackContext) {
  const {
    SLACK_SIGNING_SECRET,
    SLACK_BOT_TOKEN,
    SLACK_CHANNEL_ID,
    UPLOAD_EXPIRES,
    // EVENT_BUS_NAME,
  } = use(ConfigStack);
  const bind = [
    SLACK_SIGNING_SECRET,
    SLACK_BOT_TOKEN,
    SLACK_CHANNEL_ID,
    UPLOAD_EXPIRES,
    // EVENT_BUS_NAME,
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
          // srcPath: "src/",
          handler: "services/lambdas/process-upload.handler",
          environment: { slackSigningSecret: SLACK_SIGNING_SECRET.value },
          permissions: ['s3'],
          bind
        },
        events: ["object_created"],
        bind
      },
    },
  });
  bucket.attachPermissions([bucket, "s3"]);

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
  const eventBusDefaultPermissions = [
    new iam.PolicyStatement({
      actions: ["events:PutEvents"],
      resources: [EVENT_BUS_NAME],
    })
  ]
  const bus = new EventBus(stack, "Bus", {
    rules: {
      flowStartRule: {
        pattern: { source: ["flowStartEvent"] },
        targets: {  
          function: {
            handler: "services/lambdas/flow-start.handler",
            environment: { eventBusName: EVENT_BUS_NAME, },
            permissions: eventBusDefaultPermissions,
          }
        },
      },
      createMomentRule: {
        pattern: { source: ["createMomentEvent"] },
        targets: {  
          function: {
            handler: "services/lambdas/create-moment.handler",
            environment: { eventBusName: EVENT_BUS_NAME, },
            permissions: eventBusDefaultPermissions,
          }
        },
      },
      channelUsersQueueUrlRule: {
        pattern: { source: ["channelUsersQueueUrlEvent"] },
        targets: { 
          function: {
            handler: "services/lambdas/channel-users.handler",
            environment: { eventBusName: EVENT_BUS_NAME, },
            permissions: eventBusDefaultPermissions,
          }
          },
      },
      uploadLinkRule: {
        pattern: { source: ["uploadLinkEvent"] },
        targets: { 
          function: {
            handler: "services/lambdas/upload-link.handler",
            environment: { 
              eventBusName: EVENT_BUS_NAME,
              bucketName: bucket.bucketName
            },
            permissions: eventBusDefaultPermissions,
          }
          },
      },
      sendDmMessageRule: {
        pattern: { source: ["sendDmMessageEvent"] },
        targets: { 
          function: {
            handler: "services/lambdas/send-dm.handler",
            environment: { 
              eventBusName: EVENT_BUS_NAME,
              siteUrl
            },
            permissions: eventBusDefaultPermissions,
          }
          },
      }
    },
    bind
  });

  bus.bind(bind)
  bus.attachPermissions([bucket, "events:PutEvents"])



  const dailyNotificationRuleName = `${app.stage}-daily-notification-rule`;
  const triggerMomentHandler: FunctionDefinition = {
    handler: 'services/lambdas/cron.handler',
    bind,
    environment: {
      // flowStartQueueUrl: flowStartQueue.queueUrl,
      cloudwatchRuleName: dailyNotificationRuleName,
      eventBusName: EVENT_BUS_NAME.value
    },
    permissions: '*',
  };

  const slackCommandsApi = new Api(stack, 'Api', {
    routes: {
      'POST /slack/capture-now': {
        function: {
          handler: 'services/lambdas/cron.handler',
          timeout: 15,
          bind,
          environment: {
            cloudwatchRuleName: dailyNotificationRuleName,
            eventBusName: EVENT_BUS_NAME,
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

  new Cron(stack, 'Cron', {
    schedule: 'rate(1 minute)',
    cdk: { rule: { ruleName: dailyNotificationRuleName } },
    job: {
      function: triggerMomentHandler,
    },
  });

  stack.addOutputs({
    SiteUrl: siteUrl,
    SlackCommandAPI: slackCommandsApi.url,
    BucketName: bucket.bucketName,
    EventBridgeArnName: bus.eventBusArn
  });
}
