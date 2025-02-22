import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { Product, ErrorResponse } from '../types/interfaces';

const HEADERS = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": process.env.ALLOWED_ORIGIN || "*",
    "Access-Control-Allow-Methods": "GET"
};

export const handler = async (_event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    try {
        if (!process.env.PRODUCTS) {
            throw new Error('PRODUCTS environment variable is not set');
        }

        const products: Product[] = JSON.parse(process.env.PRODUCTS);

        // Return the products array directly
        return {
            statusCode: 200,
            headers: HEADERS,
            body: JSON.stringify(products)
        };

    } catch (error) {
        console.error('Error in getProductsList:', error);

        const errorResponse: ErrorResponse = {
            success: false,
            error: {
                message: "Internal server error",
                details: process.env.NODE_ENV !== 'production' ? error : undefined
            }
        };

        return {
            statusCode: 500,
            headers: HEADERS,
            body: JSON.stringify(errorResponse)
        };
    }
};
