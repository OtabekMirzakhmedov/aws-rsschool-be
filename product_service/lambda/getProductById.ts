import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { GetCommand } from '@aws-sdk/lib-dynamodb';
import { docClient } from './utils/dynamodb-client';
import { createSuccessResponse, createErrorResponse } from './utils/http';
import { Product, Stock } from '../types/interfaces';

const PRODUCTS_TABLE = process.env.PRODUCTS_TABLE;
const STOCKS_TABLE = process.env.STOCKS_TABLE;

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    console.log('Incoming request for getProductById:', event);

    try {
        const productId = event.pathParameters?.productId;

        if (!productId) {
            return createErrorResponse(400, "Product ID is required");
        }

        // Get product by ID
        const productResponse = await docClient.send(new GetCommand({
            TableName: PRODUCTS_TABLE,
            Key: { id: productId }
        }));

        if (!productResponse.Item) {
            return createErrorResponse(404, `Product with ID ${productId} not found`);
        }

        const product = productResponse.Item as Product;

        // Get stock information for this product
        const stockResponse = await docClient.send(new GetCommand({
            TableName: STOCKS_TABLE,
            Key: { product_id: productId }
        }));

        const stock = stockResponse.Item as Stock;

        // Join product with its stock information
        const joinedProduct = {
            ...product,
            count: stock ? stock.count : 0
        };

        return createSuccessResponse(200, joinedProduct);
    } catch (error) {
        console.error('Error in getProductById:', error);
        return createErrorResponse(500, "Internal server error", error);
    }
};