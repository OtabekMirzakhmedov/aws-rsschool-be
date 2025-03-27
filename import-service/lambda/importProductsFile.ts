import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const s3Client = new S3Client({ region: process.env.AWS_REGION });

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Credentials': true,
    'Access-Control-Allow-Methods': 'GET,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'
};

export const handler = async (
    event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
    console.log('ImportProductsFile lambda triggered:', JSON.stringify(event));

    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers: corsHeaders,
            body: ''
        };
    }

    try {
        const fileName = event.queryStringParameters?.name;
        if (!fileName) {
            return {
                statusCode: 400,
                headers: corsHeaders,
                body: 'File name is required as a query parameter'
            };
        }

        if (!fileName.endsWith('.csv')) {
            return {
                statusCode: 400,
                headers: corsHeaders,
                body: 'Only CSV files are allowed'
            };
        }

        const uniqueFileName = `${Date.now()}_${fileName}`;

        const command = new PutObjectCommand({
            Bucket: process.env.BUCKET_NAME,
            Key: `uploaded/${uniqueFileName}`,
            ContentType: 'text/csv'
        });

        const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 60 });
        console.log(`Signed URL generated: ${signedUrl}`);

        return {
            statusCode: 200,
            headers: {
                ...corsHeaders,
                'Content-Type': 'text/plain'
            },
            body: signedUrl
        };

    } catch (error) {
        console.error('Error generating signed URL:', error);
        return {
            statusCode: 500,
            headers: corsHeaders,
            body: JSON.stringify({ message: 'Internal server error' })
        };
    }
};