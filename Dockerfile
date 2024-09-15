# Stage 1: Build Stage
FROM node:18-alpine@sha256:02376a266c84acbf45bd19440e08e48b1c8b98037417334046029ab585de03e2 AS builder

WORKDIR /usr/src/app

ARG PORT
ENV PORT=$PORT

COPY package*.json ./

RUN npm install

COPY . .

RUN npm run build

# Stage 2: Production Stage
FROM node:18-alpine@sha256:02376a266c84acbf45bd19440e08e48b1c8b98037417334046029ab585de03e2

WORKDIR /usr/src/app

COPY --from=builder /usr/src/app/package*.json ./
COPY --from=builder /usr/src/app/dist ./dist

# Install only production dependencies
RUN npm install --omit=dev

CMD ["node", "dist/main.js"]
EXPOSE $PORT
