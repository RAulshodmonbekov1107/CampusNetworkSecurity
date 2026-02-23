#!/usr/bin/env python3
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
import django
django.setup()

from apps.system.elasticsearch_client import get_es_client

es = get_es_client()

# Test each aggregation separately
print("Testing Elasticsearch aggregations...\n")

# 1. Total bytes
try:
    q1 = {
        'query': {'range': {'@timestamp': {'gte': 'now-24h'}}},
        'aggs': {
            'total_bytes': {
                'sum': {
                    'script': {
                        'source': 'if (doc.containsKey("bytes") && !doc["bytes"].empty) { return doc["bytes"].value; } else { long orig = doc.containsKey("orig_bytes") && !doc["orig_bytes"].empty ? doc["orig_bytes"].value : 0; long resp = doc.containsKey("resp_bytes") && !doc["resp_bytes"].empty ? doc["resp_bytes"].value : 0; return orig + resp; }',
                        'lang': 'painless'
                    }
                }
            }
        }
    }
    r1 = es.search(index='network-flows-*', size=0, body=q1)
    print(f"✓ total_bytes: {r1['aggregations']['total_bytes']['value']:,}")
except Exception as e:
    print(f"✗ total_bytes failed: {type(e).__name__}: {str(e)[:150]}")

# 2. By source IP
try:
    q2 = {
        'query': {'range': {'@timestamp': {'gte': 'now-24h'}}},
        'aggs': {
            'by_source_ip': {
                'terms': {'field': 'source_ip', 'size': 5}
            }
        }
    }
    r2 = es.search(index='network-flows-*', size=0, body=q2)
    print(f"✓ by_source_ip: {len(r2['aggregations']['by_source_ip']['buckets'])} buckets")
except Exception as e:
    print(f"✗ by_source_ip failed: {type(e).__name__}: {str(e)[:200]}")

# 3. Timeline
try:
    q3 = {
        'query': {'range': {'@timestamp': {'gte': 'now-24h'}}},
        'aggs': {
            'timeline': {
                'date_histogram': {
                    'field': '@timestamp',
                    'fixed_interval': '1h',
                    'min_doc_count': 0
                }
            }
        }
    }
    r3 = es.search(index='network-flows-*', size=0, body=q3)
    print(f"✓ timeline: {len(r3['aggregations']['timeline']['buckets'])} hours")
except Exception as e:
    print(f"✗ timeline failed: {type(e).__name__}: {str(e)[:200]}")

print("\nIf all pass, the dashboard should work!")

