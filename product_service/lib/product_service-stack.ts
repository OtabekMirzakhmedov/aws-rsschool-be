import * as cdk from 'aws-cdk-lib';
import * as apigw from 'aws-cdk-lib/aws-apigateway';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as snsSubscriptions from 'aws-cdk-lib/aws-sns-subscriptions';
import * as lambdaEventSources from 'aws-cdk-lib/aws-lambda-event-sources';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { Construct } from 'constructs';
import * as dotenv from 'dotenv';

dotenv.config();

export class ProductServiceStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const productsTableName = process.env.PRODUCTS_TABLE;
    const stocksTableName = process.env.STOCKS_TABLE;

    if (!productsTableName || !stocksTableName) {
      throw new Error('PRODUCTS_TABLE and STOCKS_TABLE environment variables must be defined');
    }

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

    const lambdaEnvironment = {
      PRODUCTS_TABLE: productsTableName,
      STOCKS_TABLE: stocksTableName,
      REGION: this.region,
      ALLOWED_ORIGIN: process.env.ALLOWED_ORIGIN || '*',
      NODE_ENV: process.env.NODE_ENV || 'development'
    };

    const catalogItemsQueue = new sqs.Queue(this, 'CatalogItemsQueue', {
      queueName: 'catalogItemsQueue',
      visibilityTimeout: cdk.Duration.seconds(30),
      receiveMessageWaitTime: cdk.Duration.seconds(20)
    });

    const createProductTopic = new sns.Topic(this, 'CreateProductTopic', {
      topicName: 'createProductTopic'
    });

    const mainEmailAddress = process.env.MAIN_EMAIL_ADDRESS || 'otabek.mirzakhmedov@gmail.com';
    createProductTopic.addSubscription(
        new snsSubscriptions.EmailSubscription(mainEmailAddress)
    );

    const premiumEmailAddress = process.env.PREMIUM_EMAIL_ADDRESS || 'otabek.mirzakhmedov@outlook.com';
    createProductTopic.addSubscription(
        new snsSubscriptions.EmailSubscription(premiumEmailAddress, {
          filterPolicy: {
            price: sns.SubscriptionFilter.numericFilter({
              greaterThanOrEqualTo: 500
            })
          }
        })
    );

    const getProductsList = new lambda.Function(this, 'GetProductsListFunction', {
      functionName: 'getProductsList',
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'getProductsList.handler',
      code: lambda.Code.fromAsset('lambda'),
      environment: lambdaEnvironment,
    });

    productsTable.grantReadData(getProductsList);
    stocksTable.grantReadData(getProductsList);

    const getProductById = new lambda.Function(this, 'GetProductByIdFunction', {
      functionName: 'getProductById',
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'getProductById.handler',
      code: lambda.Code.fromAsset('lambda'),
      environment: lambdaEnvironment,
    });

    productsTable.grantReadData(getProductById);
    stocksTable.grantReadData(getProductById);

    const createProduct = new lambda.Function(this, 'CreateProductFunction', {
      functionName: 'createProduct',
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'createProduct.handler',
      code: lambda.Code.fromAsset('lambda'),
      environment: lambdaEnvironment,
    });

    productsTable.grantReadWriteData(createProduct);
    stocksTable.grantReadWriteData(createProduct);

    const catalogBatchProcess = new lambda.Function(this, 'CatalogBatchProcessFunction', {
      functionName: 'catalogBatchProcess',
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'catalogBatchProcess.handler',
      code: lambda.Code.fromAsset('lambda'),
      environment: {
        ...lambdaEnvironment,
        SNS_TOPIC_ARN: createProductTopic.topicArn
      },
    });

    productsTable.grantReadWriteData(catalogBatchProcess);
    stocksTable.grantReadWriteData(catalogBatchProcess);
    createProductTopic.grantPublish(catalogBatchProcess);

    catalogBatchProcess.addEventSource(
        new lambdaEventSources.SqsEventSource(catalogItemsQueue, {
          batchSize: 5,
          maxBatchingWindow: cdk.Duration.seconds(10)
        })
    );

    const api = new apigw.RestApi(this, 'ProductsApi', {
      defaultCorsPreflightOptions: {
        allowOrigins: apigw.Cors.ALL_ORIGINS,
        allowMethods: apigw.Cors.ALL_METHODS,
      },
      deployOptions: {
        stageName: process.env.STAGE || 'dev',
      }
    });

    const productsResource = api.root.addResource('products');
    productsResource.addMethod('GET', new apigw.LambdaIntegration(getProductsList));
    productsResource.addMethod('POST', new apigw.LambdaIntegration(createProduct));

    const singleProductResource = productsResource.addResource('{productId}');
    singleProductResource.addMethod('GET', new apigw.LambdaIntegration(getProductById));

    new cdk.CfnOutput(this, 'ApiUrl', {
      value: api.url,
      description: 'The URL of the deployed API'
    });

    new cdk.CfnOutput(this, 'ProductsTableName', {
      value: productsTableName,
      description: 'Products table name'
    });

    new cdk.CfnOutput(this, 'StocksTableName', {
      value: stocksTableName,
      description: 'Stocks table name'
    });

    new cdk.CfnOutput(this, 'CatalogItemsQueueUrl', {
      value: catalogItemsQueue.queueUrl,
      description: 'Catalog Items Queue URL'
    });

    new cdk.CfnOutput(this, 'CatalogItemsQueueArn', {
      value: catalogItemsQueue.queueArn,
      description: 'Catalog Items Queue ARN'
    });

    new cdk.CfnOutput(this, 'CreateProductTopicArn', {
      value: createProductTopic.topicArn,
      description: 'Create Product SNS Topic ARN'
    });
  }
}