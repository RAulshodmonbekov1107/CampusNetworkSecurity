"""
Elasticsearch-backed statistics endpoints.

These views aggregate Zeek / Suricata data stored in Elasticsearch
and expose them as lightweight JSON responses for the dashboard.
"""

import logging
from datetime import timedelta

from decouple import config

from django.utils import timezone
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.system.elasticsearch_client import get_es_client

logger = logging.getLogger(__name__)

import requests as http_requests
from requests.packages.urllib3.exceptions import InsecureRequestWarning

http_requests.packages.urllib3.disable_warnings(InsecureRequestWarning)

ZEEK_INDEX = "network-flows-*"
SURICATA_INDEX = "security-alerts-*"

WAZUH_INDEXER = config("WAZUH_INDEXER_URL", default="https://host.docker.internal:9201")
WAZUH_AUTH = (config("WAZUH_INDEXER_USER", default="admin"),
              config("WAZUH_INDEXER_PASS", default="SecretPassword"))
WAZUH_INDEX = "wazuh-alerts-4.x-*"

BYTES_SCRIPT = """
    if (doc.containsKey('bytes') && !doc['bytes'].empty) {
        return doc['bytes'].value;
    } else {
        long orig = doc.containsKey('orig_bytes') && !doc['orig_bytes'].empty ? doc['orig_bytes'].value : 0;
        long resp = doc.containsKey('resp_bytes') && !doc['resp_bytes'].empty ? doc['resp_bytes'].value : 0;
        return orig + resp;
    }
"""


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def protocol_stats(request):
    """
    GET /api/stats/protocols

    Aggregate Zeek logs to show protocol distribution over the last 24 hours.
    Returns: [{protocol, count, total_bytes}, ...]
    """
    es = get_es_client()
    try:
        body = {
            "size": 0,
            "query": {"range": {"@timestamp": {"gte": "now-24h"}}},
            "aggs": {
                "by_protocol": {
                    "terms": {"field": "proto", "size": 20, "missing": "OTHER"},
                    "aggs": {
                        "total_bytes": {
                            "sum": {"script": {"source": BYTES_SCRIPT, "lang": "painless"}}
                        }
                    },
                }
            },
        }
        resp = es.search(index=ZEEK_INDEX, body=body)
        buckets = resp["aggregations"]["by_protocol"]["buckets"]
        data = [
            {
                "protocol": b["key"],
                "count": b["doc_count"],
                "total_bytes": int(b["total_bytes"]["value"] or 0),
            }
            for b in buckets
        ]
        return Response(data)
    except Exception as exc:
        logger.error("ES protocol_stats failed: %s", exc, exc_info=True)
        return Response([], status=200)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def traffic_stats(request):
    """
    GET /api/stats/traffic

    Time-series data for bandwidth usage over the last 24 hours,
    bucketed in 1-hour intervals.
    Returns: [{time, bytes, count}, ...]
    """
    es = get_es_client()
    try:
        body = {
            "size": 0,
            "query": {"range": {"@timestamp": {"gte": "now-24h"}}},
            "aggs": {
                "timeline": {
                    "date_histogram": {
                        "field": "@timestamp",
                        "fixed_interval": "1h",
                        "min_doc_count": 0,
                        "extended_bounds": {
                            "min": "now-24h",
                            "max": "now",
                        },
                    },
                    "aggs": {
                        "bytes": {
                            "sum": {"script": {"source": BYTES_SCRIPT, "lang": "painless"}}
                        }
                    },
                }
            },
        }
        resp = es.search(index=ZEEK_INDEX, body=body)
        buckets = resp["aggregations"]["timeline"]["buckets"]
        data = [
            {
                "time": b["key_as_string"],
                "bytes": int(b["bytes"]["value"] or 0),
                "count": b["doc_count"],
            }
            for b in buckets
        ]
        return Response(data)
    except Exception as exc:
        logger.error("ES traffic_stats failed: %s", exc, exc_info=True)
        return Response([], status=200)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def alerts_from_es(request):
    """
    GET /api/stats/alerts

    Fetches the latest Suricata security alerts from Elasticsearch.
    Supports query params: severity, limit (default 50).
    """
    es = get_es_client()
    limit = int(request.query_params.get("limit", 50))
    severity_filter = request.query_params.get("severity")

    try:
        must = [{"range": {"@timestamp": {"gte": "now-7d"}}}]
        if severity_filter:
            must.append({"term": {"alert.severity": severity_filter}})

        body = {
            "size": limit,
            "query": {"bool": {"must": must}},
            "sort": [{"@timestamp": {"order": "desc"}}],
        }
        resp = es.search(index=SURICATA_INDEX, body=body)
        hits = resp.get("hits", {}).get("hits", [])
        data = []
        for hit in hits:
            src = hit["_source"]
            alert_info = src.get("alert", {})
            data.append(
                {
                    "id": hit["_id"],
                    "timestamp": src.get("@timestamp"),
                    "source_ip": src.get("source_ip") or src.get("src_ip"),
                    "destination_ip": src.get("destination_ip") or src.get("dest_ip"),
                    "source_port": src.get("source_port") or src.get("src_port"),
                    "destination_port": src.get("destination_port") or src.get("dest_port"),
                    "protocol": src.get("proto"),
                    "signature": alert_info.get("signature"),
                    "signature_id": alert_info.get("signature_id"),
                    "severity": alert_info.get("severity"),
                    "category": alert_info.get("category"),
                }
            )
        return Response(data)
    except Exception as exc:
        logger.error("ES alerts_from_es failed: %s", exc, exc_info=True)
        return Response([], status=200)


# ---------------------------------------------------------------------------
# Wazuh SIEM endpoints — proxy data from the Wazuh Indexer (OpenSearch)
# ---------------------------------------------------------------------------

def _wazuh_query(body: dict, index: str = WAZUH_INDEX) -> dict:
    """Run an ES query against the Wazuh Indexer and return the raw response."""
    r = http_requests.post(
        f"{WAZUH_INDEXER}/{index}/_search",
        auth=WAZUH_AUTH,
        json=body,
        verify=False,
        timeout=10,
    )
    r.raise_for_status()
    return r.json()


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def siem_overview(request):
    """
    GET /api/stats/siem/overview/

    Returns summary counts and a timeline for the Wazuh SIEM dashboard card.
    """
    try:
        body = {
            "size": 0,
            "query": {"range": {"@timestamp": {"gte": "now-24h"}}},
            "aggs": {
                "total": {"value_count": {"field": "@timestamp"}},
                "critical": {
                    "filter": {"range": {"rule.level": {"gte": 12}}}
                },
                "auth_fail": {
                    "filter": {"terms": {"rule.groups": ["authentication_failed"]}}
                },
                "syscheck": {
                    "filter": {"terms": {"rule.groups": ["syscheck"]}}
                },
                "timeline": {
                    "date_histogram": {
                        "field": "@timestamp",
                        "fixed_interval": "1h",
                        "min_doc_count": 0,
                        "extended_bounds": {"min": "now-24h", "max": "now"},
                    }
                },
                "by_level": {
                    "range": {
                        "field": "rule.level",
                        "ranges": [
                            {"key": "low", "from": 0, "to": 4},
                            {"key": "medium", "from": 4, "to": 8},
                            {"key": "high", "from": 8, "to": 12},
                            {"key": "critical", "from": 12},
                        ],
                    }
                },
                "top_rules": {
                    "terms": {"field": "rule.description", "size": 5}
                },
            },
        }
        resp = _wazuh_query(body)
        aggs = resp.get("aggregations", {})

        timeline = [
            {"time": b["key_as_string"], "count": b["doc_count"]}
            for b in aggs.get("timeline", {}).get("buckets", [])
        ]
        severity = {
            b["key"]: b["doc_count"]
            for b in aggs.get("by_level", {}).get("buckets", [])
        }
        top_rules = [
            {"rule": b["key"], "count": b["doc_count"]}
            for b in aggs.get("top_rules", {}).get("buckets", [])
        ]

        return Response({
            "total_alerts": aggs.get("total", {}).get("value", 0),
            "critical_alerts": aggs.get("critical", {}).get("doc_count", 0),
            "auth_failures": aggs.get("auth_fail", {}).get("doc_count", 0),
            "file_integrity": aggs.get("syscheck", {}).get("doc_count", 0),
            "timeline": timeline,
            "severity": severity,
            "top_rules": top_rules,
        })
    except Exception as exc:
        logger.error("siem_overview failed: %s", exc, exc_info=True)
        return Response({"total_alerts": 0, "critical_alerts": 0,
                         "auth_failures": 0, "file_integrity": 0,
                         "timeline": [], "severity": {}, "top_rules": []})


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def siem_alerts(request):
    """
    GET /api/stats/siem/alerts/?limit=50&level=10

    Recent Wazuh alerts, optionally filtered by minimum rule level.
    """
    limit = int(request.query_params.get("limit", 50))
    min_level = request.query_params.get("level")

    try:
        must = [{"range": {"@timestamp": {"gte": "now-24h"}}}]
        if min_level:
            must.append({"range": {"rule.level": {"gte": int(min_level)}}})

        body = {
            "size": limit,
            "query": {"bool": {"must": must}},
            "sort": [{"@timestamp": {"order": "desc"}}],
        }
        resp = _wazuh_query(body)
        hits = resp.get("hits", {}).get("hits", [])
        data = []
        for h in hits:
            src = h["_source"]
            rule = src.get("rule", {})
            agent = src.get("agent", {})
            mitre = rule.get("mitre", {})
            data.append({
                "id": h["_id"],
                "timestamp": src.get("@timestamp"),
                "rule_id": rule.get("id"),
                "rule_level": rule.get("level"),
                "description": rule.get("description"),
                "groups": rule.get("groups", []),
                "mitre_ids": mitre.get("id", []),
                "mitre_tactics": mitre.get("tactic", []),
                "mitre_techniques": mitre.get("technique", []),
                "agent_name": agent.get("name"),
                "agent_id": agent.get("id"),
                "src_ip": src.get("data", {}).get("srcip"),
                "location": src.get("location"),
            })
        return Response(data)
    except Exception as exc:
        logger.error("siem_alerts failed: %s", exc, exc_info=True)
        return Response([])


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def siem_mitre(request):
    """
    GET /api/stats/siem/mitre/

    MITRE ATT&CK tactic/technique aggregation from Wazuh alerts.
    """
    try:
        body = {
            "size": 0,
            "query": {
                "bool": {
                    "must": [{"range": {"@timestamp": {"gte": "now-24h"}}}],
                    "filter": [{"exists": {"field": "rule.mitre.id"}}],
                }
            },
            "aggs": {
                "tactics": {
                    "terms": {"field": "rule.mitre.tactic", "size": 20}
                },
                "techniques": {
                    "terms": {"field": "rule.mitre.technique", "size": 20}
                },
            },
        }
        resp = _wazuh_query(body)
        aggs = resp.get("aggregations", {})

        return Response({
            "tactics": [
                {"tactic": b["key"], "count": b["doc_count"]}
                for b in aggs.get("tactics", {}).get("buckets", [])
            ],
            "techniques": [
                {"technique": b["key"], "count": b["doc_count"]}
                for b in aggs.get("techniques", {}).get("buckets", [])
            ],
        })
    except Exception as exc:
        logger.error("siem_mitre failed: %s", exc, exc_info=True)
        return Response({"tactics": [], "techniques": []})


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def siem_fim(request):
    """
    GET /api/stats/siem/fim/

    File Integrity Monitoring summary from Wazuh alerts.
    """
    try:
        body = {
            "size": 0,
            "query": {
                "bool": {
                    "must": [{"range": {"@timestamp": {"gte": "now-24h"}}}],
                    "filter": [{"terms": {"rule.groups": ["syscheck"]}}],
                }
            },
            "aggs": {
                "by_event": {
                    "terms": {"field": "syscheck.event", "size": 10}
                },
                "top_files": {
                    "terms": {"field": "syscheck.path", "size": 10}
                },
                "timeline": {
                    "date_histogram": {
                        "field": "@timestamp",
                        "fixed_interval": "1h",
                        "min_doc_count": 0,
                    }
                },
            },
        }
        resp = _wazuh_query(body)
        aggs = resp.get("aggregations", {})

        return Response({
            "by_event": [
                {"event": b["key"], "count": b["doc_count"]}
                for b in aggs.get("by_event", {}).get("buckets", [])
            ],
            "top_files": [
                {"path": b["key"], "count": b["doc_count"]}
                for b in aggs.get("top_files", {}).get("buckets", [])
            ],
            "timeline": [
                {"time": b["key_as_string"], "count": b["doc_count"]}
                for b in aggs.get("timeline", {}).get("buckets", [])
            ],
        })
    except Exception as exc:
        logger.error("siem_fim failed: %s", exc, exc_info=True)
        return Response({"by_event": [], "top_files": [], "timeline": []})
