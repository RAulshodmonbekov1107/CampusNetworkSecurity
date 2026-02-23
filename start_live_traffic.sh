#!/bin/bash
# Quick script to start live traffic generator for presentations

echo "🚀 Starting live network traffic generator..."
echo ""
echo "Options:"
echo "  --fast    = 5 events/second (more activity)"
echo "  --normal  = 3 events/second (default)"
echo "  --slow    = 1 event/second (less activity)"
echo ""

RATE=3
if [ "$1" == "--fast" ]; then
    RATE=5
    echo "⚡ Fast mode: 5 events/second"
elif [ "$1" == "--slow" ]; then
    RATE=1
    echo "🐌 Slow mode: 1 event/second"
else
    echo "📊 Normal mode: 3 events/second"
fi

echo ""
echo "Starting generator in background..."
docker compose exec -d backend python manage.py generate_live_traffic --rate $RATE --to-db

sleep 2

echo ""
echo "✅ Generator started!"
echo ""
echo "📊 Check status:"
echo "   docker compose exec backend ps aux | grep generate_live_traffic"
echo ""
echo "🛑 To stop:"
echo "   docker compose exec backend pkill -f generate_live_traffic"
echo ""
echo "🌐 Open your dashboard at http://localhost:3000"
echo "   Dashboard refreshes every 5 seconds"
echo "   Network Traffic page refreshes every 10 seconds"
echo ""

