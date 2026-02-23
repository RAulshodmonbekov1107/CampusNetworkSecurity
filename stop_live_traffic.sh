#!/bin/bash
# Stop live traffic generator

echo "🛑 Stopping live traffic generator..."

docker compose exec backend pkill -f generate_live_traffic

sleep 1

if docker compose exec backend pgrep -f generate_live_traffic > /dev/null 2>&1; then
    echo "⚠️  Generator still running, force killing..."
    docker compose exec backend pkill -9 -f generate_live_traffic
fi

echo "✅ Generator stopped!"

