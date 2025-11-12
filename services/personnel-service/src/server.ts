import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import personnelRouter from './routes/personnel';

dotenv.config();

const app: Express = express();
const PORT = process.env.PORT || 3003;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'personnel-service',
    timestamp: new Date().toISOString(),
    s3Configured: !!process.env.AWS_S3_BUCKET_NAME,
    flaskApiUrl: process.env.FLASK_API_URL,
  });
});

// Routes
app.use('/api/personnel', personnelRouter);

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found'
  });
});

// Error handler
app.use((err: Error, req: Request, res: Response, next: any) => {
  console.error('Error:', err);
  res.status(500).json({
    success: false,
    error: err.message || 'Internal server error'
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Personnel Service running on port ${PORT}`);
  console.log(`📦 S3 Bucket: ${process.env.AWS_S3_BUCKET_NAME || 'Not configured'}`);
  console.log(`🤖 Flask API: ${process.env.FLASK_API_URL || 'Not configured'}`);
});

export default app;
