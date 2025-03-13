import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
    DynamoDBDocumentClient,
    PutCommand,
    BatchWriteCommand,
    BatchWriteCommandInput
} from '@aws-sdk/lib-dynamodb';

// Define interfaces for our data models
interface Product {
    id: string;
    title: string;
    description: string;
    price: number;
}

interface Stock {
    product_id: string;
    count: number;
}

// Configure the AWS SDK
const REGION = 'eu-west-1'; // Change to your region
const client = new DynamoDBClient({ region: REGION });
const docClient = DynamoDBDocumentClient.from(client);

// Sample products data from CDK stack
const sampleProducts: Product[] = [
    {
        description: "Latest iPhone model with A16 Bionic chip, featuring a 6.1-inch Super Retina XDR display",
        id: "7567ec4b-b10c-48c5-9345-fc73c48a80aa",
        price: 999,
        title: "iPhone 14 Pro",
    },
    {
        description: "Noise-cancelling wireless headphones with up to 30 hours of battery life",
        id: "7567ec4b-b10c-48c5-9345-fc73c48a80a1",
        price: 379,
        title: "Sony WH-1000XM4",
    },
    {
        description: "4K Ultra HD Smart LED TV with Alexa compatibility and HDR support",
        id: "7567ec4b-b10c-48c5-9345-fc73c48a80a3",
        price: 549,
        title: "Samsung 55-inch Crystal UHD",
    },
    {
        description: "Powerful gaming laptop with RTX 3060, 16GB RAM, and 512GB SSD",
        id: "7567ec4b-b10c-48c5-9345-fc73348a80a1",
        price: 1299,
        title: "ASUS ROG Strix G15",
    },
    {
        description: "Smart home security camera with 2K resolution and two-way audio",
        id: "7567ec4b-b10c-48c5-9445-fc73c48a80a2",
        price: 199,
        title: "Arlo Pro 4",
    },
    {
        description: "Mechanical gaming keyboard with RGB backlight and Cherry MX switches",
        id: "7567ec4b-b10c-45c5-9345-fc73c48a80a1",
        price: 149,
        title: "Corsair K70 RGB",
    },
    {
        description: "Wireless gaming mouse with 25K DPI sensor and 70-hour battery life",
        id: "7567ec4b-b10c-45c5-9345-fc73c48a80b2",
        price: 149,
        title: "Razer DeathAdder V3 Pro",
    },
    {
        description: "27-inch QHD gaming monitor with 165Hz refresh rate and 1ms response time",
        id: "7567ec4b-b10c-45c5-9345-fc73c48a80c3",
        price: 329,
        title: "LG UltraGear 27GL850-B",
    },
    {
        description: "Compact mirrorless camera with 24.2MP sensor and 4K video capability",
        id: "7567ec4b-b10c-45c5-9345-fc73c48a80d4",
        price: 899,
        title: "Sony Alpha a6400",
    },
    {
        description: "Smart watch with health monitoring and GPS tracking",
        id: "7567ec4b-b10c-45c5-9345-fc73c48a80e5",
        price: 399,
        title: "Garmin Fenix 7",
    }
];

// Generate stock data for each product
const generateStocks = (products: Product[]): Stock[] => {
    return products.map(product => ({
        product_id: product.id,
        count: Math.floor(Math.random() * 100) + 1 // Random stock count between 1 and 100
    }));
};

// Function to insert products into DynamoDB
const insertProducts = async (products: Product[]): Promise<void> => {
    console.log('Inserting products...');

    // Using BatchWrite for efficiency with multiple items
    const batchSize = 25; // DynamoDB BatchWrite limit is 25 items

    for (let i = 0; i < products.length; i += batchSize) {
        const batch = products.slice(i, i + batchSize);

        const params: BatchWriteCommandInput = {
            RequestItems: {
                'products': batch.map(product => ({
                    PutRequest: {
                        Item: product
                    }
                }))
            }
        };

        try {
            await docClient.send(new BatchWriteCommand(params));
            console.log(`Inserted products batch ${Math.floor(i/batchSize) + 1}`);
        } catch (error) {
            console.error('Error inserting products:', error);
            throw error;
        }
    }
};

// Function to insert stocks into DynamoDB
const insertStocks = async (stocks: Stock[]): Promise<void> => {
    console.log('Inserting stocks...');

    // Using BatchWrite for efficiency
    const batchSize = 25;

    for (let i = 0; i < stocks.length; i += batchSize) {
        const batch = stocks.slice(i, i + batchSize);

        const params: BatchWriteCommandInput = {
            RequestItems: {
                'stocks': batch.map(stock => ({
                    PutRequest: {
                        Item: stock
                    }
                }))
            }
        };

        try {
            await docClient.send(new BatchWriteCommand(params));
            console.log(`Inserted stocks batch ${Math.floor(i/batchSize) + 1}`);
        } catch (error) {
            console.error('Error inserting stocks:', error);
            throw error;
        }
    }
};

// Main function to run the script
const populateTables = async (): Promise<void> => {
    try {
        // Use only the sample products
        const products = sampleProducts;

        // Generate stock for all products
        const stocks = generateStocks(products);

        // Insert data into tables
        await insertProducts(products);
        await insertStocks(stocks);

        console.log('Successfully populated DynamoDB tables!');
        console.log(`Total products inserted: ${products.length}`);
        console.log(`Total stocks inserted: ${stocks.length}`);

        // Log product IDs for reference
        console.log('Product IDs for reference:');
        products.forEach(product => {
            console.log(`- ${product.title}: ${product.id}`);
        });
    } catch (error) {
        console.error('Error populating tables:', error instanceof Error ? error.message : String(error));
    }
};

// Run the script
populateTables();