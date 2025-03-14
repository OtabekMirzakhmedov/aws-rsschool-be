import * as cdk from 'aws-cdk-lib';
import * as apigw from 'aws-cdk-lib/aws-apigateway';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as snsSubscriptions from 'aws-cdk-lib/aws-sns-subscriptions';
import * as lambdaEventSources from 'aws-cdk-lib/aws-lambda-event-sources';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { Construct } from 'constructs';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

export class ProductServiceStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Get table names from environment variables with defaults
    const productsTableName = process.env.PRODUCTS_TABLE;
    const stocksTableName = process.env.STOCKS_TABLE;

    if (!productsTableName || !stocksTableName) {
      throw new Error('PRODUCTS_TABLE and STOCKS_TABLE environment variables must be defined');
    }

    // Reference existing DynamoDB tables
    const productsTable = dynamodb.Table.fromTableName(
        this,
        'ProductsTable',
        productsTableName
    );

    const stocksTable = dynamodb.Table.fromTableName(
        this,
        'StocksTable',
        stocksTableName
    );

    // Common environment variables for all Lambda functions
    const lambdaEnvironment = {
      PRODUCTS_TABLE: productsTableName,
      STOCKS_TABLE: stocksTableName,
      REGION: this.region,
      ALLOWED_ORIGIN: process.env.ALLOWED_ORIGIN || '*',
      NODE_ENV: process.env.NODE_ENV || 'development'
    };

    // Create SQS Queue for catalog items
    const catalogItemsQueue = new sqs.Queue(this, 'CatalogItemsQueue', {
      queueName: 'catalogItemsQueue',
      visibilityTimeout: cdk.Duration.seconds(30),
      receiveMessageWaitTime: cdk.Duration.seconds(20)
    });

    // Create SNS Topic for product creation notification
    const createProductTopic = new sns.Topic(this, 'CreateProductTopic', {
      topicName: 'createProductTopic'
    });

    // Add email subscription for all products
    const mainEmailAddress = process.env.MAIN_EMAIL_ADDRESS || 'your-email@example.com';
    createProductTopic.addSubscription(
        new snsSubscriptions.EmailSubscription(mainEmailAddress)
    );

    // Add email subscription with filter for premium products (price >= 500)
    const premiumEmailAddress = process.env.PREMIUM_EMAIL_ADDRESS || 'premium-products@example.com';
    createProductTopic.addSubscription(
        new snsSubscriptions.EmailSubscription(premiumEmailAddress, {
          filterPolicy: {
            price: sns.SubscriptionFilter.numericFilter({
              greaterThanOrEqualTo: 500
            })
          }
        })
    );

    // Create Lambda functions using NodejsFunction which bundles your code
    const getProductsList = new NodejsFunction(this, 'GetProductsListFunction', {
      entry: 'lambda/getProductsList.ts',
      handler: 'handler',
      runtime: cdk.aws_lambda.Runtime.NODEJS_18_X,
      environment: lambdaEnvironment,
    });

    // Grant only read permissions to the functions that need it
    productsTable.grantReadData(getProductsList);
    stocksTable.grantReadData(getProductsList);

    const getProductById = new NodejsFunction(this, 'GetProductByIdFunction', {
      entry: 'lambda/getProductById.ts',
      handler: 'handler',
      runtime: cdk.aws_lambda.Runtime.NODEJS_18_X,
      environment: lambdaEnvironment,
    });

    productsTable.grantReadData(getProductById);
    stocksTable.grantReadData(getProductById);

    const createProduct = new NodejsFunction(this, 'CreateProductFunction', {
      entry: 'lambda/createProduct.ts',
      handler: 'handler',
      runtime: cdk.aws_lambda.Runtime.NODEJS_18_X,
      environment: lambdaEnvironment,
    });

    // Grant both read and write permissions where needed
    productsTable.grantReadWriteData(createProduct);
    stocksTable.grantReadWriteData(createProduct);

    // Create new catalogBatchProcess Lambda function
    const catalogBatchProcess = new NodejsFunction(this, 'CatalogBatchProcessFunction', {
      entry: 'lambda/catalogBatchProcess.ts',
      handler: 'handler',
      runtime: cdk.aws_lambda.Runtime.NODEJS_18_X,
      environment: {
        ...lambdaEnvironment,
        SNS_TOPIC_ARN: createProductTopic.topicArn
      },
    });

    // Grant permissions to the catalogBatchProcess Lambda
    productsTable.grantReadWriteData(catalogBatchProcess);
    stocksTable.grantReadWriteData(catalogBatchProcess);
    createProductTopic.grantPublish(catalogBatchProcess);

    // Add SQS event source to catalogBatchProcess Lambda
    catalogBatchProcess.addEventSource(
        new lambdaEventSources.SqsEventSource(catalogItemsQueue, {
          batchSize: 5,
          maxBatchingWindow: cdk.Duration.seconds(10)
        })
    );

    // Create API Gateway REST API
    const api = new apigw.RestApi(this, 'ProductsApi', {
      defaultCorsPreflightOptions: {
        allowOrigins: apigw.Cors.ALL_ORIGINS,
        allowMethods: apigw.Cors.ALL_METHODS,
      },
      deployOptions: {
        stageName: process.env.STAGE || 'dev',
      }
    });

    // Define API routes
    const productsResource = api.root.addResource('products');
    productsResource.addMethod('GET', new apigw.LambdaIntegration(getProductsList));
    productsResource.addMethod('POST', new apigw.LambdaIntegration(createProduct));

    const singleProductResource = productsResource.addResource('{productId}');
    singleProductResource.addMethod('GET', new apigw.LambdaIntegration(getProductById));

    // Output the API URL
    new cdk.CfnOutput(this, 'ApiUrl', {
      value: api.url,
      description: 'The URL of the deployed API'
    });

    // Output table names for reference
    new cdk.CfnOutput(this, 'ProductsTableName', {
      value: productsTableName,
      description: 'Products table name'
    });

    new cdk.CfnOutput(this, 'StocksTableName', {
      value: stocksTableName,
      description: 'Stocks table name'
    });

    // Output SQS Queue URL for reference
    new cdk.CfnOutput(this, 'CatalogItemsQueueUrl', {
      value: catalogItemsQueue.queueUrl,
      description: 'Catalog Items Queue URL'
    });

    // Output SQS Queue ARN for cross-stack reference
    new cdk.CfnOutput(this, 'CatalogItemsQueueArn', {
      value: catalogItemsQueue.queueArn,
      description: 'Catalog Items Queue ARN'
    });

    // Output SNS Topic ARN for reference
    new cdk.CfnOutput(this, 'CreateProductTopicArn', {
      value: createProductTopic.topicArn,
      description: 'Create Product SNS Topic ARN'
    });
  }
}