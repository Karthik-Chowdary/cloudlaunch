# ---- Build Stage ----
FROM node:22-alpine AS builder

WORKDIR /app

# Backend
COPY backend/package.json backend/package-lock.json* ./backend/
RUN cd backend && npm ci

COPY backend/ ./backend/
RUN cd backend && npm run build

# Frontend
COPY frontend/package.json frontend/package-lock.json* ./frontend/
RUN cd frontend && npm ci --include=dev

COPY frontend/ ./frontend/
RUN cd frontend && npx vite build

# ---- Production Stage ----
FROM node:22-alpine

RUN apk add --no-cache openssh-client git

WORKDIR /app

COPY --from=builder /app/backend/dist ./dist
COPY --from=builder /app/backend/package.json ./package.json
COPY --from=builder /app/backend/package-lock.json* ./
COPY --from=builder /app/backend/data ./data

RUN npm ci --omit=dev 2>/dev/null || npm install --omit=dev

# Copy frontend build to be served by backend
COPY --from=builder /app/frontend/dist ./public

ENV NODE_ENV=production
ENV PORT=3002

EXPOSE 3002

CMD ["node", "dist/index.js"]
