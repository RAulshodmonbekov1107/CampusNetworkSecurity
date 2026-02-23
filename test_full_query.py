#!/usr/bin/env python3
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
import django
django.setup()

from apps.system.elasticsearch_client import get_es_client

es = get_es_client()

# Test the EXACT query from dashboard/views.py
query_body = {
    "query": {
        "range": {
            "@timestamp": {"gte": "now-24h"}
        }
    },
    "aggs": {
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
        },
        "by_source_ip": {
            "terms": {"field": "source_ip", "size": 5, "missing": "unknown"},
            "aggs": {
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
            },
        },
        "timeline": {
            "date_histogram": {
                "field": "@timestamp",
                "fixed_interval": "1h",
                "min_doc_count": 0,
            },
            "aggs": {
                "bytes": {
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
            },
        },
    },
}

print("Testing FULL combined query (exact copy from dashboard/views.py)...\n")

try:
    es_resp = es.search(index="network-flows-*", size=0, body=query_body)
    
    total_traffic_24h = int(es_resp["aggregations"]["total_bytes"]["value"] or 0)
    print(f"✓ total_traffic_24h: {total_traffic_24h:,}")
    
    top_source_ips = [
        {
            "source_ip": b["key"],
            "total_bytes": int(b.get("total_bytes", {}).get("value", 0) or 0),
            "count": b["doc_count"],
        }
        for b in es_resp["aggregations"]["by_source_ip"]["buckets"]
    ]
    print(f"✓ top_source_ips: {len(top_source_ips)} IPs")
    for ip in top_source_ips[:3]:
        print(f"  - {ip['source_ip']}: {ip['total_bytes']:,} bytes")
    
    traffic_timeline = [
        {
            "time": b["key_as_string"],
            "bytes": int(b["bytes"]["value"] or 0),
        }
        for b in es_resp["aggregations"]["timeline"]["buckets"]
    ]
    print(f"✓ traffic_timeline: {len(traffic_timeline)} hours")
    for tl in traffic_timeline[:3]:
        print(f"  - {tl['time']}: {tl['bytes']:,} bytes")
    
    print("\n✅ FULL QUERY WORKS! Dashboard should show data now.")
    
except Exception as e:
    print(f"❌ FULL QUERY FAILED: {type(e).__name__}: {e}")
    import traceback
    traceback.print_exc()

