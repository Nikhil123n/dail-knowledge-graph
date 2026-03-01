# ── Stage 1: Build React frontend ────────────────────────────────────────────
FROM node:20-slim AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package.json ./
RUN npm install
COPY frontend/ .
# VITE_API_URL left empty — api.js uses relative paths, nginx proxies /api/
RUN npm run build

# ── Stage 2: Final image (Python + nginx + supervisord) ───────────────────────
FROM python:3.11-slim
WORKDIR /app

# Install nginx and supervisord
RUN apt-get update && apt-get install -y nginx supervisor && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend source
COPY backend/ ./backend/

# Copy built frontend into nginx html root
COPY --from=frontend-builder /app/frontend/dist /usr/share/nginx/html

# Copy deploy configs
COPY deploy/nginx.conf /etc/nginx/conf.d/default.conf
COPY deploy/supervisord.conf /etc/supervisor/conf.d/supervisord.conf
COPY deploy/start.sh /start.sh
RUN chmod +x /start.sh

# Remove default nginx site
RUN rm -f /etc/nginx/sites-enabled/default

EXPOSE 10000

CMD ["/start.sh"]
