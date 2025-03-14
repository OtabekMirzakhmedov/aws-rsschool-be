import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as lambdaNodejs from 'aws-cdk-lib/aws-lambda-nodejs';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as s3notifications from 'aws-cdk-lib/aws-s3-notifications';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import { Construct } from 'constructs';

export class ImportServiceStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Create S3 bucket for product imports
    const importBucket = new s3.Bucket(this, 'ImportBucket', {
      bucketName: `product-import-${this.account}-${this.region}`,
      cors: [
        {
          allowedMethods: [
            s3.HttpMethods.GET,
            s3.HttpMethods.PUT,
            s3.HttpMethods.POST,
          ],
          allowedOrigins: ['*'],
          allowedHeaders: ['*'],
        },
      ],
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: cdk.RemovalPolicy.DESTROY, // For development purposes
      autoDeleteObjects: true, // For development purposes
    });

    // Reference the SQS queue from the Product Service
    // In a real scenario, you might want to use cross-stack references or SSM parameters
    const catalogItemsQueue = sqs.Queue.fromQueueArn(
        this,
        'CatalogItemsQueue',
        'arn:aws:sqs:' + this.region + ':' + this.account + ':catalogItemsQueue'
    );

    // Common environment variables for Lambda functions
    const lambdaEnvironment = {
      BUCKET_NAME: importBucket.bucketName,
      REGION: this.region,
      SQS_URL: catalogItemsQueue.queueUrl
    };

    // Create importProductsFile Lambda function
    const importProductsFile = new lambdaNodejs.NodejsFunction(this, 'ImportProductsFile', {
      functionName: 'importProductsFile',
      entry: 'lambda/importProductsFile.ts',
      handler: 'handler',
      runtime: lambda.Runtime.NODEJS_18_X,
      environment: lambdaEnvironment,
    });

    // Create importFileParser Lambda function
    const importFileParser = new lambdaNodejs.NodejsFunction(this, 'ImportFileParser', {
      functionName: 'importFileParser',
      entry: 'lambda/importFileParser.ts',
      handler: 'handler',
      runtime: lambda.Runtime.NODEJS_18_X,
      environment: lambdaEnvironment,
      timeout: cdk.Duration.seconds(30),
    });

    // Grant permissions to the Lambda functions
    importBucket.grantReadWrite(importProductsFile);
    importBucket.grantReadWrite(importFileParser);

    // Grant permission to send messages to SQS
    catalogItemsQueue.grantSendMessages(importFileParser);

    // Configure S3 event to trigger importFileParser Lambda
    importBucket.addEventNotification(
        s3.EventType.OBJECT_CREATED,
        new s3notifications.LambdaDestination(importFileParser),
        { prefix: 'uploaded/' }
    );

    // Create API Gateway REST API
    const api = new apigateway.RestApi(this, 'ImportApi', {
      restApiName: 'Import Service',
      description: 'API for product import service',
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
      },
    });

    // Create 'import' resource and method
    const importResource = api.root.addResource('import');
    importResource.addMethod('GET', new apigateway.LambdaIntegration(importProductsFile), {
      requestParameters: {
        'method.request.querystring.name': true,
      },
    });

    // Output the API URL
    new cdk.CfnOutput(this, 'ApiGatewayUrl', {
      value: api.url,
      description: 'The URL of the API Gateway',
    });

    // Output the S3 bucket name
    new cdk.CfnOutput(this, 'ImportBucketName', {
      value: importBucket.bucketName,
      description: 'The name of the S3 bucket for product imports',
    });
  }
}