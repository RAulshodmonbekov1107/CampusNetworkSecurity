# Kafka Setup and How It Works in Your Architecture

## Current Status

✅ **Kafka is now running** (container: `kafka-campus`)
✅ **Zookeeper is running** (container: `zk-campus`) - Kafka needs this for coordination

## How Kafka Works in Your System

### 1. **Kafka's Role in the Pipeline**

```
Zeek/Suricata Logs
       ↓
   Logstash (processes & normalizes)
       ↓
   ┌────┴────┐
   ↓         ↓
Kafka    Elasticsearch
(topics)  (indices)
   ↓
Django Consumer
   ↓
Django Database
```

**Kafka acts as a message broker** - it:
- Receives normalized events from Logstash
- Stores them in **topics** (like `network_flows`, `security_alerts`)
- Allows multiple consumers to read the same data
- Provides buffering if downstream systems are slow

### 2. **Current Configuration**

**Kafka Container:**
- **Name:** `kafka-campus`
- **Port:** `9092` (exposed to host)
- **Internal address:** `kafka:9092` (for Docker services)
- **Depends on:** Zookeeper (`zk-campus`)

**Topics (created automatically when Logstash publishes):**
- `network_flows` - Normalized network traffic events
- `security_alerts` - Security alerts from Suricata
- `other_events` - Any other events

### 3. **How Data Flows Through Kafka**

**Step 1: Logstash → Kafka**
```ruby
# In logstash/pipelines/zeek_suricata_to_kafka_es.conf
output {
  kafka {
    bootstrap_servers => "kafka:9092"
    topic_id => "network_flows"  # or "security_alerts"
    codec => json
  }
}
```
- Logstash publishes JSON messages to Kafka topics
- Topics are created automatically on first message

**Step 2: Kafka → Django Consumer**
```python
# backend/apps/system/management/commands/consume_kafka.py
consumer = Consumer({
    "bootstrap.servers": "kafka:9092",
    "group.id": "campus-security-consumer"
})
consumer.subscribe(["network_flows", "security_alerts"])
```
- Django consumer reads from Kafka topics
- Stores events in `NetworkTraffic` and `SecurityAlert` models
- This populates your database for the API

**Step 3: Kafka → Elasticsearch (via Logstash)**
- Logstash also writes to Elasticsearch directly
- This is for dashboard aggregations (faster than querying DB)

### 4. **Why Use Kafka?**

1. **Decoupling:** Logstash doesn't need to wait for Django/ES
2. **Buffering:** If Django is slow, Kafka holds messages
3. **Multiple Consumers:** Can have multiple services reading same data
4. **Replay:** Can re-read messages if needed
5. **Scalability:** Can add more consumers as needed

### 5. **Current Issues & Solutions**

**Issue:** Kafka wasn't running (exited with error)
- **Cause:** Started before Zookeeper was ready
- **Fix:** `docker compose up -d kafka` (now running ✅)

**Issue:** Topics don't exist yet
- **Cause:** Topics are created when first message is published
- **Solution:** Once Logstash starts sending data, topics will auto-create

### 6. **To Make Kafka Fully Functional**

1. **Ensure Kafka is running:**
   ```bash
   docker compose up -d kafka zookeeper
   ```

2. **Start Logstash** (if not running):
   ```bash
   docker compose up -d logstash
   ```

3. **Feed data to Logstash:**
   - Place Zeek logs in `/var/log/zeek/conn.log`
   - Place Suricata logs in `/var/log/suricata/eve.json`
   - Or use the live traffic generator:
     ```bash
     docker compose exec backend python manage.py generate_live_traffic
     ```

4. **Start Django Kafka Consumer:**
   ```bash
   docker compose exec backend python manage.py consume_kafka
   ```

### 7. **Verify Kafka is Working**

```bash
# Check if Kafka is running
docker ps | grep kafka-campus

# List topics (after data starts flowing)
docker exec kafka-campus kafka-topics --list --bootstrap-server localhost:9092

# Check messages in a topic
docker exec kafka-campus kafka-console-consumer \
  --bootstrap-server localhost:9092 \
  --topic network_flows \
  --from-beginning \
  --max-messages 5
```

## Summary

**Kafka Status:** ✅ Running
**Zookeeper Status:** ✅ Running  
**Topics:** Will be created automatically when Logstash publishes first message
**Next Step:** Start feeding data through Logstash to see Kafka in action

