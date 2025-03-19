import { S3Client, GetObjectCommand, CopyObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';
import { S3Event, S3Handler } from 'aws-lambda';
import { Readable } from 'stream';
const csvParser = require('csv-parser');

const s3Client = new S3Client({ region: process.env.AWS_REGION });
const sqsClient = new SQSClient({ region: process.env.AWS_REGION });
const SQS_URL = process.env.SQS_URL;

export const handler: S3Handler = async (event: S3Event) => {
    console.log("S3 event received:", JSON.stringify(event));

    for (const record of event.Records) {
        const bucket = record.s3.bucket.name;
        const key = decodeURIComponent(record.s3.object.key.replace(/\+/g, ' '));

        if (!key.startsWith("uploaded/")) {
            console.log(`Skipping file ${key} as it is not in the uploaded folder.`);
            continue;
        }

        try {
            const getObjectParams = { Bucket: bucket, Key: key };
            const getObjectCommand = new GetObjectCommand(getObjectParams);
            const response = await s3Client.send(getObjectCommand);

            const stream = response.Body as Readable;

            // Parse CSV and send records to SQS
            await new Promise<void>((resolve, reject) => {
                stream
                    .pipe(csvParser())
                    .on('data', async (data: any) => {
                        try {
                            await sqsClient.send(new SendMessageCommand({
                                QueueUrl: SQS_URL,
                                MessageBody: JSON.stringify(data),
                            }));
                            console.log("Record sent to SQS:", data);
                        } catch (error) {
                            console.error("Error sending record to SQS:", error);
                        }
                    })
                    .on('end', () => {
                        console.log("CSV parsing complete and records sent to SQS.");
                        resolve();
                    })
                    .on('error', (error: any) => {
                        console.error("Error parsing CSV:", error);
                        reject(error);
                    });
            });
            const newKey = key.replace("uploaded/", "parsed/");

            const copyParams = {
                Bucket: bucket,
                CopySource: `${bucket}/${key}`,
                Key: newKey,
            };
            const copyCommand = new CopyObjectCommand(copyParams);
            await s3Client.send(copyCommand);
            console.log(`File copied to ${newKey}`);

            const deleteParams = { Bucket: bucket, Key: key };
            const deleteCommand = new DeleteObjectCommand(deleteParams);
            await s3Client.send(deleteCommand);
            console.log(`File ${key} deleted from uploaded folder.`);

        } catch (err) {
            console.error(`Error processing file ${key}:`, err);
            throw err;
        }
    }
};