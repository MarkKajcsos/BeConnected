import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { LambdaFunction } from 'aws-cdk-lib/aws-events-targets';
import * as iam from 'aws-cdk-lib/aws-iam';
import {
  Bucket,
  Cron,
  FunctionDefinition,
  Queue,
  StackContext,
  StaticSite,
  use,
  Api,
  EventBus
} from 'sst/constructs';
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

  // TODO: move to .env or Config.secret
  const EVENT_BUS_NAME = "arn:aws:events:eu-central-1:307946669175:event-bus/markkajcsos-apex-homework-Bus";


  const flowStartQueue = new Queue(stack, 'flow-start-queue');
  const createMomentQueue = new Queue(stack, 'create-moment-queue');
  const channelUsersQueue = new Queue(stack, 'channel-users-queue');
  const uploadLinkQueue = new Queue(stack, 'upload-link-queue');
  const sendDmQueue = new Queue(stack, 'send-dm-queue');

  // ==================================================================
    
  // FrontEnd properties
  const site = new StaticSite(stack, 'ViteSite', {
    path: 'frontend',
    buildCommand: 'pnpm run build',
    buildOutput: 'dist',
  });
  const siteUrl: string = app.local
    ? JSON.parse(require('fs').readFileSync('.sst/beconnected-ngrok.json'))
        .public_url
    : site.url;

  // Bucket setup 
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
          handler: "services/lambdas/process-upload.handler",
          environment: { SLACK_SIGNING_SECRET: '801adc8c32e95bc2746de291c5f1f7d1' },
          permissions: ['s3'],
          bind
        },
        events: ["object_created"],
        bind
      },
    },
  });
  bucket.attachPermissions([bucket, ]);

  // EventBus setup
  const eventBusDefaultPermissions = [
    new iam.PolicyStatement({
      actions: ["events:PutEvents"],
      resources: [EVENT_BUS_NAME],
    })
  ]
  const bus = new EventBus(stack, "Bus", {
    rules: {
      testRule: {
        pattern: { source: ["testEvent"] },
        targets: {  
          function: {
            handler: "services/lambdas/test.handler",
            environment: { eventBusName: EVENT_BUS_NAME },
          }
         },
      },
      flowStartRule: {
        pattern: { source: ["flowStartEvent"] },
        targets: {  
          function: {
            handler: "services/lambdas/flow-start.handler",
            environment: { eventBusName: EVENT_BUS_NAME },
            permissions: eventBusDefaultPermissions,
          }
         },
      },
      createMomentRule: {
        pattern: { source: ["createMomentEvent"] },
        targets: {  
          function: {
            handler: "services/lambdas/create-moment.handler",
            environment: { eventBusName: EVENT_BUS_NAME },
            permissions: eventBusDefaultPermissions,
          }
         },
      },
      channelUsersQueueUrlRule: {
        pattern: { source: ["channelUsersQueueUrlEvent"] },
        targets: { 
          function: {
            handler: "services/lambdas/channel-users.handler",
            environment: { eventBusName: EVENT_BUS_NAME },
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
      // channelUsersRule: {
      //   pattern: {source: ["channelUsersEvent"]},
      //   targets: { channelUsersTarget: "services/lambdas/channel-users.handler" }
      // },
    },
    bind
  });

  bus.bind(bind)


  const dailyNotificationRuleName = `${app.stage}-daily-notification-rule`;
  const triggerMomentHandler: FunctionDefinition = {
    handler: 'services/lambdas/cron.handler',
    bind,
    environment: {
      flowStartQueueUrl: flowStartQueue.queueUrl,
      cloudwatchRuleName: dailyNotificationRuleName,
    },
    permissions: '*',
  };

  const slackCommandsApi = new Api(stack, 'Api', {
    routes: {
      'POST /slack/capture-now': {
        function: {
          handler: 'services/lambdas/cron.handler',
          timeout: 15,
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

  channelUsersQueue.addConsumer(stack, {
    function: {
      handler: 'services/lambdas/channel-users.handler',
      bind,
      environment: {
        uploadLinkQueueUrl: uploadLinkQueue.queueUrl,
      },
      permissions: [uploadLinkQueue],
    },
    cdk: { eventSource: { batchSize: 1 } },
  });


  stack.addOutputs({
    SiteUrl: siteUrl,
    SlackCommandAPI: slackCommandsApi.url,
    BucketName: bucket.bucketName,
  });
}
