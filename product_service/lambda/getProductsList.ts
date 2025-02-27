import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { ScanCommand } from '@aws-sdk/lib-dynamodb';
import { docClient } from './utils/dynamodb-client';
import { createSuccessResponse, createErrorResponse } from './utils/http';
import { Product, Stock } from '../types/interfaces';

const PRODUCTS_TABLE = process.env.PRODUCTS_TABLE;
const STOCKS_TABLE = process.env.STOCKS_TABLE;

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    console.log('Incoming request for getProductsList:', event);

    try {
        // Scan products table
        const productsResponse = await docClient.send(new ScanCommand({
            TableName: PRODUCTS_TABLE
        }));
        const products: Product[] = productsResponse.Items as Product[];

        // Scan stocks table
        const stocksResponse = await docClient.send(new ScanCommand({
            TableName: STOCKS_TABLE
        }));
        const stocks: Stock[] = stocksResponse.Items as Stock[];

        // Join products with their stock information
        const joinedProducts = products.map(product => {
            const stock = stocks.find(s => s.product_id === product.id);
            return {
                ...product,
                count: stock ? stock.count : 0
            };
        });

        return createSuccessResponse(200, joinedProducts);
    } catch (error) {
        console.error('Error in getProductsList:', error);
        return createErrorResponse(500, "Internal server error", error);
    }
};