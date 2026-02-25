from rest_framework.decorators import api_view, permission_classes, throttle_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import UserRateThrottle
from django.utils import timezone
from django.core.cache import cache
from django.views.decorators.cache import cache_page
from datetime import timedelta
from django.db.models import Count, Sum, Q
from apps.network.models import NetworkTraffic
from apps.alerts.models import SecurityAlert
from apps.threats.models import ThreatIntelligence
from apps.system.elasticsearch_client import get_es_client
import psutil, time


class BurstRateThrottle(UserRateThrottle):
    """Allow burst of requests."""
    rate = '100/min'


@cache_page(60 * 5)  # Cache for 5 minutes
@api_view(['GET'])
@permission_classes([IsAuthenticated])
@throttle_classes([BurstRateThrottle])
def dashboard_stats(request):
    """
    Get dashboard statistics and metrics.
    
    This view uses Redis caching for performance and prefers Elasticsearch 
    aggregations when ES is reachable, falling back to the database otherwise.
    
    Cache TTL: 5 minutes
    Rate Limit: 100 requests/minute
    """
    
    # Try to get from cache first
    cache_key = f'dashboard_stats_{request.user.id}'
    cached_data = cache.get(cache_key)
    
    if cached_data:
        return Response(cached_data)

    now = timezone.now()
    last_24h = now - timedelta(hours=24)

    es = get_es_client()

    total_traffic_24h = 0
    active_connections = 0
    traffic_timeline = []
    top_source_ips = []
    alerts_count = 0
    alerts_by_severity = []
    recent_alerts_payload = []

    try:
        # Total traffic and active connections from Elasticsearch
        # ES 8.x uses query parameter instead of body
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
                    "terms": {
                        "field": "source_ip",
                        "size": 5,
                        "missing": "unknown"
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
        
        es_resp = es.search(index="network-flows-*", size=0, body=query_body)

        total_traffic_24h = int(es_resp["aggregations"]["total_bytes"]["value"] or 0)
        top_source_ips = [
            {
                "source_ip": b["key"],
                "total_bytes": int(b.get("total_bytes", {}).get("value", 0) or 0),
                "count": b["doc_count"],
            }
            for b in es_resp["aggregations"]["by_source_ip"]["buckets"]
        ]

        traffic_timeline = [
            {
                "time": b["key_as_string"],
                "bytes": int(b["bytes"]["value"] or 0),
            }
            for b in es_resp["aggregations"]["timeline"]["buckets"]
        ]
    except Exception as e:
        # Log the error for debugging
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Elasticsearch query failed: {type(e).__name__}: {e}", exc_info=True)
        
        # Fallback to ORM if ES is unavailable
        from django.db.models import F

        orm_agg = NetworkTraffic.objects.filter(timestamp__gte=last_24h).aggregate(
            total_bytes=Sum(F("bytes_sent") + F("bytes_received"))
        )
        total_traffic_24h = orm_agg["total_bytes"] or 0

        for i in range(24):
            hour_start = last_24h + timedelta(hours=i)
            hour_end = hour_start + timedelta(hours=1)
            from django.db.models import F

            hour_traffic = (
                NetworkTraffic.objects.filter(
                    timestamp__gte=hour_start,
                    timestamp__lt=hour_end,
                ).aggregate(bytes=Sum(F("bytes_sent") + F("bytes_received")))["bytes"]
                or 0
            )
            traffic_timeline.append(
                {
                    "time": hour_start.isoformat(),
                    "bytes": hour_traffic,
                }
            )

        top_source_ips = list(
            NetworkTraffic.objects.filter(timestamp__gte=last_24h)
            .values("source_ip")
            .annotate(
                count=Count("id"),
                total_bytes=Sum(F("bytes_sent") + F("bytes_received")),
            )
            .order_by("-count")[:5]
        )

    # Always compute active connections from the database so the metric
    # is accurate even when Elasticsearch is available.
    active_connections = NetworkTraffic.objects.filter(
        timestamp__gte=now - timedelta(minutes=5),
        connection_state="ESTABLISHED",
    ).count()

    # Alerts via ORM for now (they may also be populated from Kafka consumer)
    alerts_count = SecurityAlert.objects.filter(timestamp__gte=last_24h).count()
    alerts_by_severity = list(
        SecurityAlert.objects.filter(timestamp__gte=last_24h)
        .values("severity")
        .annotate(count=Count("id"))
    )
    recent_alerts = SecurityAlert.objects.filter(
        timestamp__gte=last_24h
    ).order_by("-timestamp")[:10]
    recent_alerts_payload = [
        {
            "id": alert.id,
            "title": alert.title,
            "severity": alert.severity,
            "timestamp": alert.timestamp.isoformat(),
            "source_ip": alert.source_ip,
        }
        for alert in recent_alerts
    ]

    try:
        cpu = psutil.cpu_percent(interval=0.3)
        mem = psutil.virtual_memory().percent
        disk = psutil.disk_usage("/").percent
        boot = psutil.boot_time()
        uptime_hours = (time.time() - boot) / 3600
        net_uptime = min(99.99, 100.0 - (0.01 * max(0, 720 - uptime_hours)))
        status = "critical" if cpu > 90 or mem > 95 else ("warning" if cpu > 75 or mem > 85 else "healthy")
    except Exception:
        cpu, mem, disk, net_uptime, status = 0, 0, 0, 99.9, "unknown"

    system_health = {
        "status": status,
        "cpu_usage": round(cpu, 1),
        "memory_usage": round(mem, 1),
        "disk_usage": round(disk, 1),
        "network_uptime": round(net_uptime, 2),
    }

    response_data = {
        "metrics": {
            "total_traffic_24h": total_traffic_24h,
            "active_connections": active_connections,
            "alerts_count": alerts_count,
            "system_health": system_health,
        },
        "traffic_timeline": traffic_timeline,
        "top_source_ips": top_source_ips,
        "alerts_by_severity": alerts_by_severity,
        "recent_alerts": recent_alerts_payload,
    }
    
    # Cache the response
    cache.set(cache_key, response_data, 300)  # 5 minutes

    return Response(response_data)
