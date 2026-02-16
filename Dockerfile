# Base stage
FROM node:20-alpine AS base
WORKDIR /usr/src/app

# Install netcat for database health checks
RUN apk add --no-cache netcat-openbsd

# Instalar pnpm o usar npm? Usaremos npm por defecto ya que ví package-lock.json
COPY package*.json ./
COPY .npmrc ./
ARG NODE_AUTH_TOKEN
ENV NODE_AUTH_TOKEN=${NODE_AUTH_TOKEN}
RUN npm install
COPY . .

# Development stage
FROM base AS development
CMD ["npm", "run", "start:dev"]

# Build stage
FROM base AS build
RUN npm run build

# Production stage
FROM node:20-alpine AS production
ARG NODE_ENV=production
ENV NODE_ENV=${NODE_ENV}
ENV HUSKY=0
WORKDIR /usr/src/app
COPY --from=build /usr/src/app/dist ./dist
COPY --from=build /usr/src/app/node_modules ./node_modules
COPY --from=build /usr/src/app/package*.json ./
COPY --from=build /usr/src/app/src ./src
COPY --from=build /usr/src/app/libs ./libs
COPY --from=build /usr/src/app/typeorm.config.ts ./typeorm.config.ts
COPY --from=build /usr/src/app/tsconfig.json ./tsconfig.json

EXPOSE 3000
CMD ["npm", "run", "start:prod:migrate"]
