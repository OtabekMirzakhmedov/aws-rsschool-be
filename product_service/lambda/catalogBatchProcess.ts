import { SQSEvent, SQSHandler } from 'aws-lambda';
import { TransactWriteCommand, TransactWriteCommandInput } from '@aws-sdk/lib-dynamodb';
import { SNSClient, PublishCommand } from '@aws-sdk/client-sns';
import { docClient } from './utils/dynamodb-client';
import * as crypto from 'crypto';

function generateId() {
    return crypto.randomUUID();
}

const PRODUCTS_TABLE = process.env.PRODUCTS_TABLE;
const STOCKS_TABLE = process.env.STOCKS_TABLE;
const SNS_TOPIC_ARN = process.env.SNS_TOPIC_ARN;
const region = process.env.REGION || 'eu-west-1';

const snsClient = new SNSClient({ region });

export const handler: SQSHandler = async (event: SQSEvent) => {
    console.log('Processing batch of records:', JSON.stringify(event.Records));

    const processPromises = event.Records.map(async (record) => {
        try {
            const recordBody = JSON.parse(record.body);
            console.log('Processing record:', JSON.stringify(recordBody));

            const { title, description, price, count } = recordBody;

            if (!title || price === undefined) {
                console.error('Missing required fields: title and price are required');
                return;
            }

            const priceNum = Number(price);
            if (isNaN(priceNum) || priceNum < 0) {
                console.error('Price must be a positive number');
                return;
            }

            const countNum = count !== undefined ? Number(count) : 0;
            if (isNaN(countNum) || countNum < 0) {
                console.error('Count must be a positive number');
                return;
            }

            const productId = generateId();

            const product = {
                id: productId,
                title,
                description: description || '',
                price: priceNum
            };

            const transactParams: TransactWriteCommandInput = {
                TransactItems: [
                    {
                        Put: {
                            TableName: PRODUCTS_TABLE,
                            Item: product
                        }
                    },
                    {
                        Put: {
                            TableName: STOCKS_TABLE,
                            Item: {
                                product_id: productId,
                                count: countNum
                            }
                        }
                    }
                ]
            };

            await docClient.send(new TransactWriteCommand(transactParams));

            const productWithCount = {
                ...product,
                count: countNum
            };

            await snsClient.send(new PublishCommand({
                TopicArn: SNS_TOPIC_ARN,
                Message: JSON.stringify({
                    message: 'New product created',
                    product: productWithCount
                }),
                Subject: 'New Product Created',
                MessageAttributes: {
                    price: {
                        DataType: 'Number',
                        StringValue: priceNum.toString()
                    },
                    title: {
                        DataType: 'String',
                        StringValue: title
                    }
                }
            }));

            console.log(`Successfully created product ${productId} and sent SNS notification`);
            return productId;
        } catch (error) {
            console.error('Error processing record:', error);
            throw error;
        }
    });

    await Promise.all(processPromises);
    console.log('Batch processing completed');
};