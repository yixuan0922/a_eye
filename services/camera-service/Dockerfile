FROM node:20-alpine

# Install OpenSSL for Prisma
RUN apk add --no-cache openssl

WORKDIR /app

# Copy shared schema first (from project root context)
COPY shared ./shared

# Copy package files
COPY services/camera-service/package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY services/camera-service ./

# Generate Prisma Client
RUN npx prisma generate --schema=./shared/schema.prisma

# Build TypeScript
RUN npm run build

EXPOSE 3004

CMD ["npm", "start"]
