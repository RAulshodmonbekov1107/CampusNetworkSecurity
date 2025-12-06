#!/usr/bin/env python3
"""Inject test network traffic data directly into Elasticsearch."""
import json
import random
import sys
from datetime import datetime, timedelta
from elasticsearch import Elasticsearch

es = Elasticsearch(['http://localhost:9200'])

protocols = ["TCP", "UDP", "HTTP", "HTTPS", "SSH", "DNS", "ICMP"]
applications = ["Chrome", "Firefox", "SSH", "MySQL", "PostgreSQL", "Apache", "Nginx"]

count = int(sys.argv[1]) if len(sys.argv) > 1 else 200
hours = int(sys.argv[2]) if len(sys.argv) > 2 else 24

print(f"Injecting {count} events into Elasticsearch...")

now = datetime.now()
events = []
for i in range(count):
    timestamp = now - timedelta(
        hours=random.randint(0, hours),
        minutes=random.randint(0, 59),
        seconds=random.randint(0, 59),
    )
    source_ip = f"192.168.1.{random.randint(1, 254)}"
    dest_ip = f"{random.randint(1, 223)}.{random.randint(1, 255)}.{random.randint(1, 255)}.{random.randint(1, 255)}"
    orig_bytes = random.randint(100, 10000000)
    resp_bytes = random.randint(100, 10000000)
    total_bytes = orig_bytes + resp_bytes

    event = {
        "@timestamp": timestamp.isoformat(),
        "source_ip": source_ip,
        "destination_ip": dest_ip,
        "source_port": random.randint(1024, 65535),
        "destination_port": random.choice([80, 443, 22, 3306, 5432, 8080, 3389]),
        "proto": random.choice(protocols),
        "orig_bytes": orig_bytes,
        "resp_bytes": resp_bytes,
        "bytes": total_bytes,
        "packets_sent": random.randint(1, 1000),
        "packets_received": random.randint(1, 1000),
        "conn_state": "ESTABLISHED",
        "duration": random.uniform(0.1, 3600.0),
        "service": random.choice(applications) if random.random() > 0.3 else None,
    }
    events.append(event)

# Bulk index
index_name = f"network-flows-{datetime.now().strftime('%Y.%m.%d')}"
from elasticsearch.helpers import bulk

actions = [{"_index": index_name, "_source": event} for event in events]

success, failed = bulk(es, actions, raise_on_error=False)
print(f"Successfully indexed {success} events to {index_name}")
if failed:
    print(f"Failed to index {len(failed)} events")

