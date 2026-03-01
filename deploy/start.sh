#!/bin/sh
# Substitute the PORT env var into nginx config (Render sets $PORT)
sed -i "s/LISTEN_PORT/${PORT:-10000}/g" /etc/nginx/conf.d/default.conf

# Start supervisord (manages both nginx + uvicorn)
exec /usr/bin/supervisord -c /etc/supervisor/conf.d/supervisord.conf
