import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { TransactWriteCommand, TransactWriteCommandInput } from '@aws-sdk/lib-dynamodb';
import { docClient } from './utils/dynamodb-client';
import { createSuccessResponse, createErrorResponse } from './utils/http';
import { Product } from '../types/interfaces';
import * as crypto from 'crypto';

// Generate a random UUID
function generateId() {
    return crypto.randomUUID();
}

const PRODUCTS_TABLE = process.env.PRODUCTS_TABLE;
const STOCKS_TABLE = process.env.STOCKS_TABLE;

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    console.log('Incoming request for createProduct:', event);

    try {
        if (!event.body) {
            return createErrorResponse(400, "Request body is required");
        }

        const { title, description, price, count } = JSON.parse(event.body);

        // Validate required fields
        if (!title || price === undefined) {
            return createErrorResponse(400, "Title and price are required fields");
        }

        // Validate price is a number and positive
        if (typeof price !== 'number' || price < 0) {
            return createErrorResponse(400, "Price must be a positive number");
        }

        // Validate count if provided
        if (count !== undefined && (typeof count !== 'number' || count < 0)) {
            return createErrorResponse(400, "Count must be a positive number");
        }

        // Generate a new UUID for the product
        const productId = generateId();

        // Create the product object
        const product: Product = {
            id: productId,
            title,
            description: description || '',
            price
        };

        // Use a transaction to ensure both product and stock are created together
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
                            count: count || 0
                        }
                    }
                }
            ]
        };

        await docClient.send(new TransactWriteCommand(transactParams));

        // Return the newly created product with its stock count
        const newProduct = {
            ...product,
            count: count || 0
        };

        return createSuccessResponse(201, newProduct);
    } catch (error) {
        console.error('Error in createProduct:', error);
        return createErrorResponse(500, "Internal server error", error);
    }
};