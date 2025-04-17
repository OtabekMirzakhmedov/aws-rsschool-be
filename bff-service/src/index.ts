import app from './app';
import dotenv from 'dotenv';

dotenv.config();

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`BFF Service running on port ${PORT}`);
    console.log(`Available at http://localhost:${PORT}`);

    // Log available services
    const productUrl = process.env.PRODUCT_SERVICE_URL;
    if (productUrl) {
        console.log(`Product service proxied at http://localhost:${PORT}/product/*`);
    }
});