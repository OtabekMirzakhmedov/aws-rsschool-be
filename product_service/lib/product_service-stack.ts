import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigw from 'aws-cdk-lib/aws-apigateway';
import { Construct } from 'constructs';

export class ProductServiceStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const products = JSON.stringify([
      {
        description: "Latest iPhone model with A16 Bionic chip, featuring a 6.1-inch Super Retina XDR display",
        id: "7567ec4b-b10c-48c5-9345-fc73c48a80aa",
        price: 999,
        title: "iPhone 14 Pro",
      },
      {
        description: "Noise-cancelling wireless headphones with up to 30 hours of battery life",
        id: "7567ec4b-b10c-48c5-9345-fc73c48a80a1",
        price: 379,
        title: "Sony WH-1000XM4",
      },
      {
        description: "4K Ultra HD Smart LED TV with Alexa compatibility and HDR support",
        id: "7567ec4b-b10c-48c5-9345-fc73c48a80a3",
        price: 549,
        title: "Samsung 55-inch Crystal UHD",
      },
      {
        description: "Powerful gaming laptop with RTX 3060, 16GB RAM, and 512GB SSD",
        id: "7567ec4b-b10c-48c5-9345-fc73348a80a1",
        price: 1299,
        title: "ASUS ROG Strix G15",
      },
      {
        description: "Smart home security camera with 2K resolution and two-way audio",
        id: "7567ec4b-b10c-48c5-9445-fc73c48a80a2",
        price: 199,
        title: "Arlo Pro 4",
      },
      {
        description: "Mechanical gaming keyboard with RGB backlight and Cherry MX switches",
        id: "7567ec4b-b10c-45c5-9345-fc73c48a80a1",
        price: 149,
        title: "Corsair K70 RGB",
      },
      {
        description: "Wireless gaming mouse with 25K DPI sensor and 70-hour battery life",
        id: "7567ec4b-b10c-45c5-9345-fc73c48a80b2",
        price: 149,
        title: "Razer DeathAdder V3 Pro",
      },
      {
        description: "27-inch QHD gaming monitor with 165Hz refresh rate and 1ms response time",
        id: "7567ec4b-b10c-45c5-9345-fc73c48a80c3",
        price: 329,
        title: "LG UltraGear 27GL850-B",
      },
      {
        description: "Compact mirrorless camera with 24.2MP sensor and 4K video capability",
        id: "7567ec4b-b10c-45c5-9345-fc73c48a80d4",
        price: 899,
        title: "Sony Alpha a6400",
      },
      {
        description: "Smart watch with health monitoring and GPS tracking",
        id: "7567ec4b-b10c-45c5-9345-fc73c48a80e5",
        price: 399,
        title: "Garmin Fenix 7",
      }
    ]);

    const getProductsList = new lambda.Function(this, 'GetProductsListFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'getProductsList.handler',
      code: lambda.Code.fromAsset('lambda'),
      environment: { PRODUCTS: products }
    });

    const getProductById = new lambda.Function(this, 'GetProductByIdFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'getProductById.handler',
      code: lambda.Code.fromAsset('lambda'),
      environment: { PRODUCTS: products }
    });

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

    const singleProductResource = productsResource.addResource('{productId}');
    singleProductResource.addMethod('GET', new apigw.LambdaIntegration(getProductById));
  }
}

