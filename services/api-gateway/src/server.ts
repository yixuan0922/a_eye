import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createProxyMiddleware } from 'http-proxy-middleware';
import rateLimit from 'express-rate-limit';

dotenv.config();

const app: Express = express();
const PORT = process.env.PORT || 4000;

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Limit each IP to 1000 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
});

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(limiter);

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'api-gateway',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// Service URLs from environment variables
const SERVICES = {
  violations: process.env.VIOLATIONS_SERVICE_URL || 'http://localhost:3001',
  unauthorized: process.env.UNAUTHORIZED_SERVICE_URL || 'http://localhost:3002',
  personnel: process.env.PERSONNEL_SERVICE_URL || 'http://localhost:3003',
  camera: process.env.CAMERA_SERVICE_URL || 'http://localhost:3004',
  attendance: process.env.ATTENDANCE_SERVICE_URL || 'http://localhost:3005',
  site: process.env.SITE_SERVICE_URL || 'http://localhost:3006',
};

console.log('🔗 Service Configuration:');
console.log(JSON.stringify(SERVICES, null, 2));

// Proxy configuration with error handling
const proxyOptions = (target: string) => ({
  target,
  changeOrigin: true,
  pathRewrite: (path: string) => {
    // Remove the service prefix from the path
    return path;
  },
  onProxyReq: (proxyReq: any, req: Request, res: Response) => {
    console.log(`[Proxy] ${req.method} ${req.url} → ${target}${req.url}`);
  },
  onError: (err: Error, req: Request, res: Response) => {
    console.error(`[Proxy Error] ${req.method} ${req.url}:`, err.message);
    res.status(503).json({
      success: false,
      error: 'Service temporarily unavailable',
      message: err.message,
    });
  },
});

// Route proxies
app.use('/api/violations', createProxyMiddleware(proxyOptions(SERVICES.violations)));
app.use('/api/ppe-violations', createProxyMiddleware(proxyOptions(SERVICES.violations)));

app.use('/api/unauthorized-access', createProxyMiddleware(proxyOptions(SERVICES.unauthorized)));

app.use('/api/personnel', createProxyMiddleware(proxyOptions(SERVICES.personnel)));

app.use('/api/cameras', createProxyMiddleware(proxyOptions(SERVICES.camera)));

app.use('/api/attendance', createProxyMiddleware(proxyOptions(SERVICES.attendance)));

app.use('/api/sites', createProxyMiddleware(proxyOptions(SERVICES.site)));

// Service status endpoint
app.get('/api/services/status', async (req: Request, res: Response) => {
  const checkService = async (name: string, url: string) => {
    try {
      const response = await fetch(`${url}/health`, {
        signal: AbortSignal.timeout(5000),
      });
      const data = await response.json();
      return { name, status: 'healthy', url, details: data };
    } catch (error) {
      return {
        name,
        status: 'unhealthy',
        url,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  };

  const statuses = await Promise.all([
    checkService('violations', SERVICES.violations),
    checkService('unauthorized', SERVICES.unauthorized),
    checkService('personnel', SERVICES.personnel),
    checkService('camera', SERVICES.camera),
    checkService('attendance', SERVICES.attendance),
    checkService('site', SERVICES.site),
  ]);

  const allHealthy = statuses.every((s) => s.status === 'healthy');

  res.status(allHealthy ? 200 : 503).json({
    gateway: 'healthy',
    services: statuses,
    timestamp: new Date().toISOString(),
  });
});

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    path: req.url,
  });
});

// Error handler
app.use((err: Error, req: Request, res: Response, next: any) => {
  console.error('Gateway Error:', err);
  res.status(500).json({
    success: false,
    error: err.message || 'Internal gateway error',
  });
});

app.listen(PORT, () => {
  console.log(`\n🚀 API Gateway running on port ${PORT}`);
  console.log(`📊 Service Status: http://localhost:${PORT}/api/services/status\n`);
});

export default app;
