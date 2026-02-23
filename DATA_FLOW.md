# Data Flow: How Logstash Connects to Your Frontend Dashboard

## Complete Architecture Flow

```
┌─────────────────────────────────────────────────────────────────┐
│  1. DATA SOURCES (Zeek & Suricata)                              │
│     - Zeek writes: /var/log/zeek/conn.log                      │
│     - Suricata writes: /var/log/suricata/eve.json              │
└───────────────────────┬─────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────────┐
│  2. LOGSTASH (Data Ingestion & Processing)                      │
│     - Reads log files from mounted volumes                      │
│     - Parses Zeek TSV format → JSON                             │
│     - Parses Suricata JSON → Normalized format                  │
│     - Tags events: "network_flow" or "security_alert"           │
│     - Normalizes field names (src_ip → source_ip, etc.)         │
└───────────────────────┬─────────────────────────────────────────┘
                        │
                        ▼
        ┌───────────────┴───────────────┐
        │                               │
        ▼                               ▼
┌──────────────────┐          ┌──────────────────┐
│  3A. KAFKA       │          │  3B. ELASTICSEARCH│
│  Topics:         │          │  Indices:         │
│  - network_flows │          │  - network-flows-*│
│  - security_    │          │  - security-      │
│    alerts        │          │    alerts-*       │
└────────┬─────────┘          └────────┬─────────┘
         │                             │
         │                             │
         ▼                             ▼
┌──────────────────┐          ┌──────────────────┐
│  4A. KAFKA       │          │  4B. DJANGO API  │
│  CONSUMER        │          │  (dashboard/     │
│  (Optional)      │          │   views.py)      │
│  - Reads from    │          │  - Queries ES    │
│    Kafka topics  │          │  - Aggregates    │
│  - Stores in     │          │    data          │
│    Django DB     │          │  - Returns JSON  │
└──────────────────┘          └────────┬─────────┘
                                       │
                                       │ HTTP REST API
                                       │ GET /api/dashboard/stats/
                                       ▼
┌─────────────────────────────────────────────────────────────────┐
│  5. REACT FRONTEND (Dashboard.tsx)                              │
│     - Calls: dashboardService.getStats()                        │
│     - Receives JSON with:                                        │
│       * total_traffic_24h                                        │
│       * traffic_timeline (hourly data)                          │
│       * top_source_ips                                          │
│       * alerts_count                                            │
│     - Displays in:                                               │
│       * StatCards (Total Traffic, Active Connections, etc.)     │
│       * Line Chart (Traffic Over Time)                          │
│       * Doughnut Chart (Protocol Distribution)                  │
│       * Table (Top Source IPs)                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Step-by-Step Connection Details

### Step 1: Logstash → Elasticsearch
**File:** `logstash/pipelines/zeek_suricata_to_kafka_es.conf`

```ruby
output {
  elasticsearch {
    hosts => ["http://elasticsearch:9200"]
    index => "network-flows-%{+YYYY.MM.dd}"  # Creates daily indices
  }
}
```

**What happens:**
- Logstash processes each log entry
- Sends normalized JSON documents to Elasticsearch
- Creates indices like `network-flows-2025.12.04`

### Step 2: Django → Elasticsearch Query
**File:** `backend/apps/dashboard/views.py` (function: `dashboard_stats`)

```python
es = get_es_client()  # Connects to http://elasticsearch:9200
es_resp = es.search(
    index="network-flows-*",  # Searches all daily indices
    body={
        "query": {"range": {"@timestamp": {"gte": "now-24h"}}},
        "aggs": {
            "total_bytes": {"sum": {"field": "bytes"}},
            "timeline": {"date_histogram": {...}},
            "by_source_ip": {"terms": {...}}
        }
    }
)
```

**What happens:**
- Django queries Elasticsearch for last 24 hours
- Gets aggregations: total bytes, timeline, top IPs
- Returns JSON response to frontend

### Step 3: Frontend → Django API
**File:** `frontend/src/pages/Dashboard.tsx`

```typescript
const loadStats = async () => {
  const data = await dashboardService.getStats();  // Calls /api/dashboard/stats/
  setStats(data);  // Updates React state
};

useEffect(() => {
  loadStats();
  const interval = setInterval(loadStats, 30000);  // Refresh every 30s
  return () => clearInterval(interval);
}, []);
```

**What happens:**
- React component calls Django REST API
- Receives JSON response
- Updates charts and cards with new data
- Auto-refreshes every 30 seconds

## Current Status Check

To verify the connection is working:

1. **Check if Elasticsearch has data:**
   ```bash
   curl http://localhost:9200/network-flows-*/_count
   ```
   Should return: `"count" : 430` (or more)

2. **Check if Django can query Elasticsearch:**
   ```bash
   # In backend directory
   python manage.py shell
   >>> from apps.system.elasticsearch_client import get_es_client
   >>> es = get_es_client()
   >>> es.ping()  # Should return True
   >>> es.count(index='network-flows-*')  # Should show document count
   ```

3. **Check if frontend is calling the API:**
   - Open browser DevTools (F12)
   - Go to Network tab
   - Look for: `GET /api/dashboard/stats/`
   - Check response - should have `total_traffic_24h`, `traffic_timeline`, etc.

## Why You Might Not See Data

1. **Elasticsearch is empty** → No data from Logstash yet
   - **Fix:** Inject test data (we already did this - 430 events)

2. **Django can't connect to Elasticsearch** → Wrong host/port
   - **Fix:** Check `ELASTICSEARCH_HOST` env var in docker-compose.yml

3. **Frontend API call fails** → Authentication or CORS issue
   - **Fix:** Check browser console for errors

4. **Dashboard query returns empty** → ES query syntax issue
   - **Fix:** Check `dashboard/views.py` exception handling

## Making It Work Right Now

Since you have 430 events in Elasticsearch, the dashboard should show data. If it doesn't:

1. **Restart Django backend** to pick up ES connection:
   ```bash
   docker compose restart backend
   # OR if running on host:
   # Stop current Django process and restart
   ```

2. **Clear browser cache** and refresh dashboard

3. **Check browser console** for JavaScript errors

4. **Verify API response** by visiting directly:
   ```
   http://localhost:8000/api/dashboard/stats/
   ```
   (You'll need to login first or add auth token)

The connection chain is: **Logstash → Elasticsearch → Django API → React Frontend**



