FROM node:20-alpine AS base
WORKDIR /app
COPY package*.json ./
RUN npm install

# Production build stage
FROM base AS build
COPY . .
RUN npm run build

# Production image: serve with lightweight static server
FROM node:20-alpine AS production
WORKDIR /app
RUN npm install -g serve
COPY --from=build /app/dist ./dist
EXPOSE 5173
CMD ["serve", "-s", "dist", "-l", "5173"]

# Development image: run Vite dev server with hot reload
FROM base AS development
COPY . .
ENV VITE_DISABLE_HMR=true
EXPOSE 5173
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "5173"]
