// Product table model
export interface Product {
    id: string;
    title: string;
    description: string;
    price: number;
}

// Stock table model
export interface Stock {
    product_id: string;
    count: number;
}

// Error response format
export interface ErrorResponse {
    success: false;
    error: {
        message: string;
        details?: any;
    };
}

// Frontend combined model (product with stock count)
export interface ProductWithCount extends Product {
    count: number;
}