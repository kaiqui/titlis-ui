# ── Build stage ──────────────────────────────────────────────────────────────
FROM node:22-alpine AS build
WORKDIR /app

# VITE_* vars são substituídas no bundle JS em build time
ARG VITE_API_URL=/v1
ENV VITE_API_URL=$VITE_API_URL

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# ── Runtime stage (nginx) ─────────────────────────────────────────────────────
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html

ARG API_UPSTREAM=http://titlis-api:8080
ENV API_UPSTREAM=$API_UPSTREAM

# SPA fallback: redireciona 404 para index.html (React Router)
RUN printf 'server {\n\
  listen 80;\n\
  root /usr/share/nginx/html;\n\
  index index.html;\n\
  add_header Cache-Control "no-store";\n\
  location /v1/ {\n\
    proxy_pass %s/v1/;\n\
    proxy_http_version 1.1;\n\
    proxy_set_header Host $host;\n\
    proxy_set_header X-Real-IP $remote_addr;\n\
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;\n\
    proxy_set_header X-Forwarded-Proto $scheme;\n\
  }\n\
  location = /health {\n\
    proxy_pass %s/health;\n\
  }\n\
  location / {\n\
    try_files $uri $uri/ /index.html;\n\
  }\n\
}\n' "$API_UPSTREAM" "$API_UPSTREAM" > /etc/nginx/conf.d/default.conf

EXPOSE 80
