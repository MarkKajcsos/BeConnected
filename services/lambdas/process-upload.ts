import { S3Handler } from 'aws-lambda';
import { S3 } from 'aws-sdk';
import { S3ImageMetaData } from './types';
import { sendImageInReplyMessage } from 'slack/postImageInThread';

export const handler: S3Handler = async (event) => {
  for (const record of event.Records) {
    const objectKey = record.s3.object.key;
    const bucketName = record.s3.bucket.name;

    try {
      // Download blob image form S3 bucket
      const s3Object = await downloadPhotoFromBucket(
        record.s3.object.key,
        bucketName
      );
      const metadata = s3Object.Metadata as S3ImageMetaData;
      const region = process.env.AWS_REGION;
      const imageUrl = `https://${bucketName}.s3.${region}.amazonaws.com/${objectKey}`;

      // Post image in related thread
      await sendImageInReplyMessage({
        clientSlackSecret: String(process.env.slackSigningSecret),
        userId: metadata.userid,
        messageHeader: ' - Thanks for your capture',
        channelId: metadata.clientchannelid,
        threadTs: metadata.threadid,
        imageUrl,
      });
    } catch (error) {
      console.log(`Process upload has been failed - Error: ${error}`);
    }
  }
};

const downloadPhotoFromBucket = async (
  objectKey: string,
  bucketName: string
) => {
  const s3 = new S3();

  try {
    return await s3.getObject({ Bucket: bucketName, Key: objectKey }).promise();
  } catch (error) {
    console.error('Error downloading from S3:', error);
    throw error;
  }
};
