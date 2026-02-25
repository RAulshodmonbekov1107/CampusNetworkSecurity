"""
Elasticsearch-backed statistics endpoints.

These views aggregate Zeek / Suricata data stored in Elasticsearch
and expose them as lightweight JSON responses for the dashboard.
"""

import logging
from datetime import timedelta

from django.utils import timezone
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.system.elasticsearch_client import get_es_client

logger = logging.getLogger(__name__)

ZEEK_INDEX = "network-flows-*"
SURICATA_INDEX = "security-alerts-*"

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
