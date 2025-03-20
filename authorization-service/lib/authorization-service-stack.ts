import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as dotenv from 'dotenv';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';

dotenv.config();

export class AuthorizationServiceStack extends cdk.Stack {
  public readonly basicAuthorizerFunction: lambda.Function;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    console.log('Setting up Lambda with environment variables for authentication');

    this.basicAuthorizerFunction = new lambda.Function(this, 'BasicAuthorizerFunction', {
      functionName: 'basicAuthorizer',
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'basicAuthorizer.handler',
      code: lambda.Code.fromAsset('lambda'),
      environment: {
        CREDENTIALS: process.env.CREDENTIALS || ''
      },
    });

    this.basicAuthorizerFunction.addPermission('ApiGatewayInvoke', {
      principal: new iam.ServicePrincipal('apigateway.amazonaws.com'),
    });

    new cdk.CfnOutput(this, 'BasicAuthorizerFunctionArn', {
      value: this.basicAuthorizerFunction.functionArn,
      description: 'ARN of the Basic Authorizer Lambda function',
      exportName: 'BasicAuthorizerFunctionArn'
    });
  }
}