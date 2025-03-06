import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigw from 'aws-cdk-lib/aws-apigateway';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as s3n from 'aws-cdk-lib/aws-s3-notifications';
import { Construct } from 'constructs';

export class ImportServiceStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const importBucket = s3.Bucket.fromBucketName(
        this,
        'ImportBucket',
        process.env.BUCKET_NAME
    );

    const importProductsFile = new lambda.Function(this, 'ImportProductsFileFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'importProductsFile.handler',
      code: lambda.Code.fromAsset('lambda'),
      environment: {
        BUCKET_NAME: importBucket.bucketName
      }
    });

    importProductsFile.addToRolePolicy(new iam.PolicyStatement({
      actions: ['s3:PutObject'],
      resources: [`${importBucket.bucketArn}/*`]
    }));

    const api = new apigw.RestApi(this, 'ImportApi', {
      defaultCorsPreflightOptions: {
        allowOrigins: apigw.Cors.ALL_ORIGINS,
        allowMethods: apigw.Cors.ALL_METHODS,
      },
      deployOptions: { stageName: 'dev' }
    });

    const importResource = api.root.addResource('import');
    importResource.addMethod('GET', new apigw.LambdaIntegration(importProductsFile), {
      requestParameters: {
        'method.request.querystring.name': true
      }
    });

    new cdk.CfnOutput(this, 'ImportApiUrl', {
      value: api.url,
      description: 'URL of the Import API'
    });

    const importFileParser = new lambda.Function(this, 'ImportFileParserFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'importFileParser.handler',
      code: lambda.Code.fromAsset('lambda'),
      environment: {
        BUCKET_NAME: importBucket.bucketName
      }
    });

    importFileParser.addToRolePolicy(new iam.PolicyStatement({
      actions: ['s3:GetObject', 's3:CopyObject', 's3:DeleteObject', 's3:PutObject'],
      resources: [`${importBucket.bucketArn}/*`]
    }));

    importBucket.addEventNotification(
        s3.EventType.OBJECT_CREATED,
        new s3n.LambdaDestination(importFileParser),
        { prefix: 'uploaded/' }
    );
  }
}
