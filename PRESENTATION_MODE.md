# 🎯 Presentation Mode - Live Traffic Generator

## Quick Start for Your Presentation

### 1. Start Live Traffic Generator

```bash
# Start generating live traffic (runs in background)
docker compose exec -d backend python manage.py generate_live_traffic --rate 3 --to-db

# Or run in foreground to see output:
docker compose exec backend python manage.py generate_live_traffic --rate 5 --to-db
```

**Options:**
- `--rate 3` = 3 events per second (adjust as needed)
- `--to-db` = Also save to database (for Network Traffic page)
- `--duration 30` = Run for 30 minutes then stop

### 2. Check It's Working

```bash
# Check recent traffic in database
docker compose exec backend python manage.py shell -c "from apps.network.models import NetworkTraffic; from django.utils import timezone; from datetime import timedelta; print(NetworkTraffic.objects.filter(timestamp__gte=timezone.now() - timedelta(minutes=1)).count())"

# Check Elasticsearch
docker compose exec elasticsearch curl -s "http://localhost:9200/network-flows-*/_count?pretty"
```

### 3. View Live Updates

- **Dashboard**: Auto-refreshes every 5 seconds
- **Network Traffic Page**: Auto-refreshes every 10 seconds
- Just open your browser and watch the data update!

### 4. Stop Generator

```bash
# Find the process
docker compose exec backend ps aux | grep generate_live_traffic

# Kill it
docker compose exec backend pkill -f generate_live_traffic
```

## What You'll See

✅ **Dashboard:**
- Traffic metrics updating in real-time
- Timeline chart showing live traffic flow
- Top source IPs changing
- Alert distribution updating

✅ **Network Traffic Page:**
- New connections appearing
- Protocol distribution updating
- Traffic table refreshing

## Tips for Presentation

1. **Start generator 2-3 minutes before demo** - Let some data accumulate
2. **Use moderate rate** - `--rate 3` is good, `--rate 5` for more activity
3. **Show both pages** - Dashboard for overview, Network Traffic for details
4. **Mention the architecture** - "Data flows from network sensors → Logstash → Kafka → Elasticsearch → Dashboard"

## Troubleshooting

**No data showing?**
- Check generator is running: `docker compose exec backend ps aux | grep generate_live_traffic`
- Check Elasticsearch: `docker compose exec elasticsearch curl http://localhost:9200/_cluster/health`
- Refresh browser (Ctrl+Shift+R)

**Too much/little data?**
- Adjust `--rate` parameter (lower = less, higher = more)
- Wait a few minutes for data to accumulate

