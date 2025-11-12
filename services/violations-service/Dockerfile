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

EXPOSE 3001

CMD ["npm", "start"]
