import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { Rule } from 'aws-cdk-lib/aws-events';
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
  Api
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

  // queues
  

  const flowStartQueue = new Queue(stack, 'flow-start-queue');
  const createMomentQueue = new Queue(stack, 'create-moment-queue');
  const channelUsersQueue = new Queue(stack, 'channel-users-queue');
  const uploadLinkQueue = new Queue(stack, 'upload-link-queue');
  const sendDmQueue = new Queue(stack, 'send-dm-queue');

  // ==================================================================
  // const createMomentRule = new Rule(stack, 'CreateMomentRule', {
  //   eventPattern: {
  //     source: ['beconnected.app'],
  //     detailType: ['CreateMoment'],
  //   },
  // });
  
  // // Instantiate Lambda function
  // const createMomentLambda = new lambda.Function(stack, 'CreateMomentLambda', {
  //   runtime: lambda.Runtime.NODEJS_LATEST,
  //   handler: 'create-moment.handler',
  //   code: lambda.Code.fromAsset('services/lambdas'),  // Adjust the path to your lambda code
  //   environment: {
  //     channelUsersQueueUrl: channelUsersQueue.queueUrl,  // If required for downstream processing
  //   },
  // });
  
  // // Attach necessary permissions
  // createMomentLambda.addToRolePolicy(new iam.PolicyStatement({
  //   actions: ['sqs:SendMessage', 'sqs:ReceiveMessage', 'events:PutEvents'],  // Example actions
  //   resources: [channelUsersQueue.queueArn],  // Grant permission to interact with the queue
  // }));
  
  // // Set Lambda as the target for the EventBridge rule
  // createMomentRule.addTarget(new LambdaFunction(createMomentLambda));
  // ==================================================================
  

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
          permissions: ['s3'],
          bind
        },
        events: ["object_created"],
      },
    },
  });
  bucket.attachPermissions([bucket]);

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
            flowStartQueueUrl: flowStartQueue.queueUrl,
            cloudwatchRuleName: dailyNotificationRuleName,
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

  // consumers
  flowStartQueue.addConsumer(stack, {
    function: {
      handler: 'services/lambdas/flow-start.handler',
      bind,
      environment: {
        createMomentQueueUrl: createMomentQueue.queueUrl,
        // createMomentQueueUrlEvent: 'CreateMoment',

      },
      permissions: [createMomentQueue],
    },
    cdk: { eventSource: { batchSize: 1 } },
  });

  createMomentQueue.addConsumer(stack, {
    function: {
      handler: 'services/lambdas/create-moment.handler',
      bind,
      environment: {
        channelUsersQueueUrl: channelUsersQueue.queueUrl,
      },
      permissions: [channelUsersQueue],
    },
    cdk: { eventSource: { batchSize: 1 } },
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

  uploadLinkQueue.addConsumer(stack, {
    function: {
      handler: 'services/lambdas/upload-link.handler',
      bind,
      environment: {
        sendDmQueueUrl: sendDmQueue.queueUrl,
        bucketName: bucket.bucketName,
        siteUrl,
      },
      permissions: [bucket, sendDmQueue],
    },
    cdk: { eventSource: { batchSize: 1 } },
  });

  sendDmQueue.addConsumer(stack, {
    function: {
      handler: 'services/lambdas/send-dm.handler',
      bind,
      environment: {
        siteUrl,
      },
    },
    cdk: { eventSource: { batchSize: 1 } },
  });

  stack.addOutputs({
    SiteUrl: siteUrl,
    SlackCommandAPI: slackCommandsApi.url,
    BucketName: bucket.bucketName,
  });
}
