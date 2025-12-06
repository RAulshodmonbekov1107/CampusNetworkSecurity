#!/usr/bin/env python3
"""Test if Django dashboard can query Elasticsearch correctly."""
import os
import sys
import django

sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.system.elasticsearch_client import get_es_client

es = get_es_client()
print(f"✓ Elasticsearch connection: {es.ping()}")

# Simple query test
try:
    resp = es.search(
        index="network-flows-*",
        size=0,
        body={
            "query": {"match_all": {}},
            "aggs": {
                "total_count": {"value_count": {"field": "source_ip"}},
                "total_bytes": {
                    "sum": {
                        "script": {
                            "source": """
                                if (doc.containsKey('bytes') && !doc['bytes'].empty) {
                                    return doc['bytes'].value;
                                } else {
                                    long orig = doc.containsKey('orig_bytes') && !doc['orig_bytes'].empty ? doc['orig_bytes'].value : 0;
                                    long resp = doc.containsKey('resp_bytes') && !doc['resp_bytes'].empty ? doc['resp_bytes'].value : 0;
                                    return orig + resp;
                                }
                            """,
                            "lang": "painless"
                        }
                    }
                }
            }
        }
    )
    
    count = resp["aggregations"]["total_count"]["value"]
    total_bytes = resp["aggregations"]["total_bytes"]["value"]
    
    print(f"✓ Documents found: {count}")
    print(f"✓ Total bytes: {total_bytes:,}")
    print("\n✅ Dashboard should be able to query Elasticsearch!")
    
except Exception as e:
    print(f"❌ Error querying Elasticsearch: {type(e).__name__}: {e}")
    import traceback
    traceback.print_exc()

