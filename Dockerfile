# ── Build stage ──────────────────────────────────────────────────────────────
FROM node:22-alpine AS build
WORKDIR /app

# VITE_* vars são substituídas no bundle JS em build time
ARG VITE_API_URL=/v1
ARG VITE_APP_ENV=local
ARG VITE_AUTH_MODE=okta
ARG VITE_OKTA_ISSUER=
ARG VITE_OKTA_CLIENT_ID=
ARG VITE_OKTA_AUDIENCE=api://titlis
ARG VITE_OKTA_REDIRECT_URI=http://localhost:13000/login/callback
ARG VITE_OKTA_POST_LOGOUT_REDIRECT_URI=http://localhost:13000/login
ARG VITE_DEV_TENANT_ID=1
ARG VITE_DEV_TENANT_SLUG=dev-tenant-1
ARG VITE_DEV_TENANT_NAME="Tenant 1"
ARG VITE_DEV_USER_EMAIL=dev@titlis.local
ARG VITE_DEV_USER_NAME="Dev Bypass"
ARG VITE_DEV_ROLES=titlis.admin
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_APP_ENV=$VITE_APP_ENV
ENV VITE_AUTH_MODE=$VITE_AUTH_MODE
ENV VITE_OKTA_ISSUER=$VITE_OKTA_ISSUER
ENV VITE_OKTA_CLIENT_ID=$VITE_OKTA_CLIENT_ID
ENV VITE_OKTA_AUDIENCE=$VITE_OKTA_AUDIENCE
ENV VITE_OKTA_REDIRECT_URI=$VITE_OKTA_REDIRECT_URI
ENV VITE_OKTA_POST_LOGOUT_REDIRECT_URI=$VITE_OKTA_POST_LOGOUT_REDIRECT_URI
ENV VITE_DEV_TENANT_ID=$VITE_DEV_TENANT_ID
ENV VITE_DEV_TENANT_SLUG=$VITE_DEV_TENANT_SLUG
ENV VITE_DEV_TENANT_NAME=$VITE_DEV_TENANT_NAME
ENV VITE_DEV_USER_EMAIL=$VITE_DEV_USER_EMAIL
ENV VITE_DEV_USER_NAME=$VITE_DEV_USER_NAME
ENV VITE_DEV_ROLES=$VITE_DEV_ROLES

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
