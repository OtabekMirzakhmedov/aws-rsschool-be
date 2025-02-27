import { APIGatewayProxyResult } from 'aws-lambda';
import {ErrorResponse} from "../../types/interfaces";


// Common headers for all responses
export const HEADERS = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": process.env.ALLOWED_ORIGIN || "*",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS"
};

// Success response helper
export const createSuccessResponse = (statusCode: number, body: any): APIGatewayProxyResult => {
    return {
        statusCode,
        headers: HEADERS,
        body: JSON.stringify(body)
    };
};

// Error response helper
export const createErrorResponse = (
    statusCode: number,
    message: string,
    error?: any
): APIGatewayProxyResult => {
    const errorResponse: ErrorResponse = {
        success: false,
        error: {
            message,
            details: process.env.NODE_ENV !== 'production' ? error : undefined
        }
    };

    return {
        statusCode,
        headers: HEADERS,
        body: JSON.stringify(errorResponse)
    };
};