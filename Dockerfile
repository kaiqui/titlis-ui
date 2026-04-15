FROM node:22-alpine AS build
WORKDIR /app

ENV VITE_API_URL=https://api.confia.jeitto.com.br/v1
ENV VITE_APP_ENV=production
ENV VITE_AUTH_MODE=okta
ENV VITE_OKTA_ISSUER=
ENV VITE_OKTA_CLIENT_ID=
ENV VITE_OKTA_AUDIENCE=api://titlis
ENV VITE_OKTA_REDIRECT_URI=https://confia.jeitto.com.br/login/callback
ENV VITE_OKTA_POST_LOGOUT_REDIRECT_URI=https://confia.jeitto.com.br/login

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
