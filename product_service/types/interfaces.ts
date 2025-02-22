export interface Product {
    id: string;
    title: string;
    description: string;
    price: number;
}

export interface SuccessResponse {
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


