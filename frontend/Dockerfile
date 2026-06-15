FROM node:20-alpine AS base
WORKDIR /app
COPY package*.json ./
RUN npm install

# Build stage
FROM base AS build
# API base baked at build time. Default is the relative path used behind a
# reverse proxy (same-origin). For split-domain hosts (Railway/Vercel) override
# with the backend's absolute URL, e.g. https://<backend>.up.railway.app/api/v1
ARG VITE_API_URL=/api/v1
ENV VITE_API_URL=${VITE_API_URL}
COPY . .
RUN npm run build

# Development image: run Vite dev server with hot reload
FROM base AS development
COPY . .
ENV VITE_DISABLE_HMR=true
EXPOSE 5173
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "5173"]

# Production image (kept LAST so `docker build`/Railway default to this target).
# Serves the static SPA, honouring $PORT when the platform injects it (Railway).
FROM node:20-alpine AS production
WORKDIR /app
RUN npm install -g serve
COPY --from=build /app/dist ./dist
EXPOSE 5173
CMD ["sh", "-c", "serve -s dist -l tcp://0.0.0.0:${PORT:-5173}"]
