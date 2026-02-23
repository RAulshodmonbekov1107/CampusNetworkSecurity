#!/usr/bin/env python3
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
import django
django.setup()

from apps.system.elasticsearch_client import get_es_client
import json

es = get_es_client()

q = {
    'query': {'range': {'@timestamp': {'gte': 'now-24h'}}},
    'aggs': {
        'by_source_ip': {
            'terms': {'field': 'source_ip', 'size': 2},
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
    }
}

resp = es.search(index='network-flows-*', size=0, body=q)
if resp['aggregations']['by_source_ip']['buckets']:
    bucket = resp['aggregations']['by_source_ip']['buckets'][0]
    print("Bucket structure:")
    print(json.dumps(bucket, indent=2))
    print("\nKeys in bucket:", list(bucket.keys()))
else:
    print("No buckets found")

