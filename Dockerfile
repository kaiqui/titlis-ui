FROM node:22-alpine AS build
WORKDIR /app

ENV VITE_API_URL=http://localhost:30081/v1
ENV VITE_APP_NAME=JeittoConfia
ENV VITE_APP_ENV=production
ENV VITE_AUTH_MODE=okta
ENV VITE_OKTA_ISSUER=https://jeitto.okta.com
ENV VITE_OKTA_CLIENT_ID=0oa22earki9XZ2BhX1d8
ENV VITE_OKTA_AUDIENCE=api://default
ENV VITE_OKTA_REDIRECT_URI=http://localhost:30080/login/callback
ENV VITE_OKTA_POST_LOGOUT_REDIRECT_URI=http://localhost:30080/login
ENV VITE_OKTA_TENANT_SLUG=jeitto
# ENV VITE_HIDDEN_FEATURES=nav_incidents,nav_applications,nav_slos,nav_recommendations

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM node:22-alpine
WORKDIR /app

RUN npm install -g serve

COPY --from=build /app/dist ./dist

EXPOSE 3000
CMD ["serve", "-s", "dist", "-l", "3000"]