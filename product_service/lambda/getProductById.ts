import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { Product, SingleProductResponse, ErrorResponse } from '../types/interfaces';

const HEADERS = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": process.env.ALLOWED_ORIGIN || "*",
    "Access-Control-Allow-Methods": "GET"
};

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    try {
        const productId = event.pathParameters?.id;

        if (!productId) {
            return {
                statusCode: 400,
                headers: HEADERS,
                body: JSON.stringify({
                    success: false,
                    error: {
                        message: "Product ID is required"
                    }
                })
            };
        }

        if (!process.env.PRODUCTS) {
            throw new Error('PRODUCTS environment variable is not set');
        }

        const products: Product[] = JSON.parse(process.env.PRODUCTS);
        const product = products.find(p => p.id === productId);

        if (!product) {
            return {
                statusCode: 404,
                headers: HEADERS,
                body: JSON.stringify({
                    success: false,
                    error: {
                        message: `Product with ID ${productId} not found`
                    }
                })
            };
        }

        const response: SingleProductResponse = {
            success: true,
            data: {
                product
            }
        };

        return {
            statusCode: 200,
            headers: HEADERS,
            body: JSON.stringify(response)
        };

    } catch (error) {
        console.error('Error in getProductById:', error);

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
