// Product related interfaces
export interface Product {
    id: string;
    title: string;
    description: string;
    price: number;
}

// API Response interfaces
export interface SuccessResponse {
    success: true;
    data: unknown;
}

export interface ProductsListResponse extends SuccessResponse {
    data: {
        products: Product[];
    };
}

export interface SingleProductResponse extends SuccessResponse {
    data: {
        product: Product;
    };
}

export interface ErrorResponse {
    success: false;
    error: {
        message: string;
        code?: string;
        details?: unknown;
    };
}

// API Request interfaces
export interface ProductQueryParams {
    limit?: number;
    offset?: number;
    sortBy?: 'price' | 'title';
    order?: 'asc' | 'desc';
}

// Stock related interfaces (if you plan to add stock management)
export interface Stock {
    product_id: string;
    count: number;
}

// Common response headers
export interface CommonHeaders {
    'Content-Type': string;
    'Access-Control-Allow-Origin': string;
    'Access-Control-Allow-Methods': string;
    'Access-Control-Allow-Headers'?: string;
}

// Lambda specific interfaces
export interface LambdaEnvironment {
    PRODUCTS: string;
    ALLOWED_ORIGIN?: string;
    NODE_ENV?: string;
    TABLE_NAME?: string;
}

// Database interfaces (if you plan to use DynamoDB)
export interface ProductRecord extends Omit<Product, 'id'> {
    PK: string;  // Partition Key (e.g., 'PRODUCT#${id}')
    SK: string;  // Sort Key (if needed)
    GSI1PK?: string;  // Global Secondary Index Partition Key
    GSI1SK?: string;  // Global Secondary Index Sort Key
    createdAt: string;
    updatedAt: string;
}
