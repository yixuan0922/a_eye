FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY services/api-gateway/package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY services/api-gateway/ .

# Build TypeScript
RUN npm run build

EXPOSE 4000

CMD ["npm", "start"]
