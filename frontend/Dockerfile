# Multi-stage build for optimized production image

# Stage 1: Build stage
FROM node:22-alpine AS build

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies (including dev dependencies needed for build)
RUN npm ci

# Copy source code
COPY . .

# Build-time environment for Vite
ARG VITE_API_URL
ARG VITE_WS_URL
ARG VITE_UI_THEME
ARG VITE_APP_NAME
ARG VITE_APP_SHORT_NAME
ARG VITE_APP_DESCRIPTION
ARG VITE_AUTH_TOKEN_KEY
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_WS_URL=$VITE_WS_URL
ENV VITE_UI_THEME=$VITE_UI_THEME
ENV VITE_APP_NAME=$VITE_APP_NAME
ENV VITE_APP_SHORT_NAME=$VITE_APP_SHORT_NAME
ENV VITE_APP_DESCRIPTION=$VITE_APP_DESCRIPTION
ENV VITE_AUTH_TOKEN_KEY=$VITE_AUTH_TOKEN_KEY

# Build the application
RUN npm run build

# Stage 2: Production stage
FROM nginx:alpine

# Install curl for health checks
RUN apk add --no-cache curl

# Build-time domain configuration
ARG FAMTOWN_DOMAIN=example.com

# Copy custom nginx configuration
COPY --from=build /app/dist /usr/share/nginx/html

# Create custom nginx config for React SPA
RUN echo 'server { \
    listen 80; \
    server_name '${FAMTOWN_DOMAIN}'; \
    \
    client_max_body_size 50M; \
    \
    root /usr/share/nginx/html; \
    index index.html; \
    \
    # Strengthen conditional requests/caching \
    if_modified_since exact; \
    etag on; \
    \
    # Handle React Router \
    location / { \
        try_files $uri $uri/ /index.html; \
    } \
    \
    # Ensure HTML is never cached (so new deployments are picked up) \
    location = /index.html { \
        add_header Cache-Control "no-store, no-cache, must-revalidate, proxy-revalidate" always; \
        expires -1; \
    } \
    location /api { \
        proxy_pass http://famtown-backend:8000; \
        proxy_set_header X-Real-IP $remote_addr; \
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for; \
        proxy_set_header X-Forwarded-Proto $scheme; \
    } \
    \
    location /api/ws { \
        proxy_pass http://famtown-backend:8000/api/ws; \
        proxy_set_header X-Real-IP $remote_addr; \
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for; \
        proxy_set_header X-Forwarded-Proto $scheme; \
        proxy_http_version 1.1; \
        proxy_set_header Upgrade $http_upgrade; \
        proxy_set_header Connection "upgrade"; \
    } \
    \
    # Cache static assets aggressively (filenames are content-hashed by the build) \
    location ~* \.(?:png|jpg|jpeg|gif|ico|svg|webp)$ { \
        expires 1y; \
        add_header Cache-Control "public, max-age=31536000, immutable" always; \
        access_log off; \
    } \
    \
    # Security headers \
    add_header X-Frame-Options "SAMEORIGIN" always; \
    add_header X-Content-Type-Options "nosniff" always; \
    add_header X-XSS-Protection "1; mode=block" always; \
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always; \
    \
    # Gzip compression \
    gzip on; \
    gzip_vary on; \
    gzip_min_length 1024; \
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json; \
}' > /etc/nginx/conf.d/default.conf

# Create non-root user for security
# TODO requires use of nginxinc/nginx-unprivileged:alpine image
# RUN addgroup -g 1001 -S nodejs \
#     && adduser -S nextjs -u 1001 \
#     && chown -R nextjs:nodejs /usr/share/nginx/html \
#     && chown -R nextjs:nodejs /var/cache/nginx \
#     && chown -R nextjs:nodejs /var/log/nginx \
#     && chown -R nextjs:nodejs /etc/nginx/conf.d \
#     && touch /var/run/nginx.pid \
#     && chown -R nextjs:nodejs /var/run/nginx.pid

# USER nextjs

# Expose ports
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:80/ || exit 1

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
