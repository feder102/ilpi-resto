FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy app
COPY . .

# For development: run dev server with source files
# The dev server handles bundling on-the-fly
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "5173"]
