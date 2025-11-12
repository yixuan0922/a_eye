#!/bin/bash

# Script to create remaining microservices (personnel, camera, attendance, site)
# This creates basic service templates following the pattern of violations-service

set -e

SERVICES=("personnel-service:3003" "camera-service:3004" "attendance-service:3005" "site-service:3006")

for SERVICE_INFO in "${SERVICES[@]}"; do
  IFS=':' read -r SERVICE PORT <<< "$SERVICE_INFO"

  echo "Creating $SERVICE on port $PORT..."

  SERVICE_DIR="services/$SERVICE"

  # Create package.json
  cat > "$SERVICE_DIR/package.json" << EOF
{
  "name": "$SERVICE",
  "version": "1.0.0",
  "description": "$SERVICE for A_Eye",
  "main": "dist/server.js",
  "scripts": {
    "dev": "tsx watch src/server.ts",
    "build": "tsc",
    "start": "node dist/server.js",
    "prisma:generate": "prisma generate --schema=../../shared/schema.prisma"
  },
  "dependencies": {
    "@prisma/client": "^5.7.0",
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "dotenv": "^16.3.1"
  },
  "devDependencies": {
    "@types/express": "^4.17.21",
    "@types/cors": "^2.8.17",
    "@types/node": "^20.10.0",
    "tsx": "^4.7.0",
    "typescript": "^5.3.3",
    "prisma": "^5.7.0"
  }
}
EOF

  # Create tsconfig.json
  cat > "$SERVICE_DIR/tsconfig.json" << EOF
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "moduleResolution": "node",
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "paths": {
      "@shared/*": ["../../shared/*"]
    }
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
EOF

  # Create .env.example
  cat > "$SERVICE_DIR/.env.example" << EOF
PORT=$PORT
DATABASE_URL=postgresql://postgres:postgres@postgres:5432/a_eye
NODE_ENV=development
EOF

  # Create server.ts
  cat > "$SERVICE_DIR/src/server.ts" << EOF
import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app: Express = express();
const PORT = process.env.PORT || $PORT;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: '$SERVICE',
    timestamp: new Date().toISOString()
  });
});

// TODO: Add your routes here
// Example:
// import myRouter from './routes/my-routes';
// app.use('/api/my-endpoint', myRouter);

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
  console.log(\`🚀 $SERVICE running on port \${PORT}\`);
});

export default app;
EOF

  # Create Dockerfile
  cat > "$SERVICE_DIR/Dockerfile" << EOF
FROM node:20-alpine

WORKDIR /app

# Copy shared schema first
COPY ../../shared ./shared

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Generate Prisma Client
RUN npx prisma generate --schema=../../shared/schema.prisma

# Build TypeScript
RUN npm run build

EXPOSE $PORT

CMD ["npm", "start"]
EOF

  echo "✅ Created $SERVICE"
done

echo ""
echo "🎉 All remaining services created!"
echo ""
echo "Next steps:"
echo "1. Implement routes and business logic for each service"
echo "2. Run 'docker-compose up --build' to test all services"
echo "3. Complete the Terraform modules for deployment"
