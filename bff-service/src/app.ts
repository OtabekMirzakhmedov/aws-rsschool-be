import express, { Request, Response, NextFunction } from 'express';
import axios from 'axios';
import dotenv from 'dotenv';
import cors from 'cors';

dotenv.config();

const app = express();
app.use(express.json());
app.use(cors());

// Service mapping
const serviceMap: Record<string, string | undefined> = {
    'product': process.env.PRODUCT_SERVICE_URL,
    // Add more services here in the future
};

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
    res.status(200).json({ status: 'healthy' });
});

// Root endpoint
app.get('/', (req: Request, res: Response) => {
    res.status(200).json({
        message: 'BFF Service is running',
        services: Object.keys(serviceMap).map(key => ({
            name: key,
            url: `${req.protocol}://${req.get('host')}/${key}`
        }))
    });
});

// Middleware for service routing
app.use('/:service', (req: Request, res: Response, next: NextFunction) => {
    const serviceName = req.params.service;
    const serviceUrl = serviceMap[serviceName];

    if (!serviceUrl) {
        return res.status(502).json({ error: 'Cannot process request', message: `Unknown service: ${serviceName}` });
    }

    // Get the path including any part after the service name
    const path = req.originalUrl.substring(req.originalUrl.indexOf(serviceName) + serviceName.length);
    const targetUrl = `${serviceUrl}${path}`;

    console.log(`Forwarding ${req.method} request to: ${targetUrl}`);

    axios({
        method: req.method,
        url: targetUrl,
        data: req.method !== 'GET' ? req.body : undefined,
        headers: {
            ...req.headers as Record<string, string>,
            host: new URL(serviceUrl).host,
        },
        params: req.query,
        responseType: 'json',
    })
        .then(response => {
            res.status(response.status).json(response.data);
        })
        .catch(error => {
            console.error('Error forwarding request:', error);
            if (axios.isAxiosError(error) && error.response) {
                res.status(error.response.status).json(error.response.data);
            } else {
                res.status(500).json({
                    error: 'Internal Server Error',
                    message: error instanceof Error ? error.message : String(error)
                });
            }
        });
});

export default app;