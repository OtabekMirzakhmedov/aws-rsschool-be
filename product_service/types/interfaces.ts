export interface Product {
    id: string;
    title: string;
    description: string;
    price: number;
}

export interface ErrorResponse {
    success: false;
    error: {
        message: string;
        code?: string;
        details?: unknown;
    };
}


