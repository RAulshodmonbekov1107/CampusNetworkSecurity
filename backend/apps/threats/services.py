"""
AbuseIPDB reputation lookup service.

Checks external IPs against the AbuseIPDB API and caches results.
Uses ABUSEIPDB_API_KEY from environment (mock key is fine for dev).
"""

import hashlib
import logging
from typing import Iterable

import requests
from decouple import config
from django.core.cache import cache

logger = logging.getLogger(__name__)

ABUSEIPDB_API_KEY = config("ABUSEIPDB_API_KEY", default="mock-api-key-for-development")
ABUSEIPDB_URL = "https://api.abuseipdb.com/api/v2/check"
ABUSEIPDB_BULK_URL = "https://api.abuseipdb.com/api/v2/bulk-report"
CACHE_TTL = 60 * 60  # 1 hour
REQUEST_TIMEOUT = 3  # seconds (reduced from 10)


def check_ip_reputation(ip_address: str) -> dict:
    """Look up a single IP's reputation via AbuseIPDB.

    Results are cached for 1 hour per IP.  When the API key is a mock
    value or the request fails, a synthetic fallback is returned.
    """
    cache_key = f"abuseipdb:{ip_address}"
    cached = cache.get(cache_key)
    if cached is not None:
        return cached

    if ABUSEIPDB_API_KEY == "mock-api-key-for-development":
        result = _mock_lookup(ip_address)
        cache.set(cache_key, result, CACHE_TTL)
        return result

    try:
        resp = requests.get(
            ABUSEIPDB_URL,
            headers={
                "Key": ABUSEIPDB_API_KEY,
                "Accept": "application/json",
            },
            params={"ipAddress": ip_address, "maxAgeInDays": 90},
            timeout=REQUEST_TIMEOUT,
        )
        resp.raise_for_status()
        data = resp.json().get("data", {})
        result = {
            "ip": ip_address,
            "abuse_confidence_score": data.get("abuseConfidenceScore", 0),
            "country_code": data.get("countryCode", ""),
            "isp": data.get("isp", ""),
            "is_public": data.get("isPublic", True),
            "total_reports": data.get("totalReports", 0),
            "last_reported_at": data.get("lastReportedAt"),
        }
    except Exception as exc:
        logger.warning("AbuseIPDB lookup failed for %s: %s", ip_address, exc)
        result = _mock_lookup(ip_address)

    cache.set(cache_key, result, CACHE_TTL)
    return result


def check_ip_reputation_batch(ip_addresses: Iterable[str]) -> dict[str, dict]:
    """Look up multiple IPs, returning ``{ip: reputation_dict}``.

    Checks the cache first; only uncached IPs are fetched individually
    (AbuseIPDB's bulk endpoint is report-oriented, so we iterate).
    """
    results: dict[str, dict] = {}
    to_fetch: list[str] = []

    for ip in ip_addresses:
        cache_key = f"abuseipdb:{ip}"
        cached = cache.get(cache_key)
        if cached is not None:
            results[ip] = cached
        else:
            to_fetch.append(ip)

    for ip in to_fetch:
        results[ip] = check_ip_reputation(ip)

    return results


_MOCK_COUNTRIES = ["US", "RU", "CN", "DE", "GB", "FR", "KR", "JP", "BR", "IN", "NL", "AU"]
_MOCK_ISPS = [
    "Google LLC", "Cloudflare Inc.", "Amazon.com Inc.", "Microsoft Corp.",
    "DigitalOcean LLC", "OVH SAS", "Hetzner Online GmbH", "Linode LLC",
]


def _mock_lookup(ip_address: str) -> dict:
    """Return deterministic but realistic mock data for development.

    Private/campus IPs are marked safe (score 0).  Public IPs get a
    consistent pseudo-random score derived from their hash so the same IP
    always returns the same result across restarts.
    """
    is_private = ip_address.startswith(("10.", "192.168.", "172.16.", "127."))

    if is_private:
        return {
            "ip": ip_address,
            "abuse_confidence_score": 0,
            "country_code": "",
            "isp": "Campus Network",
            "is_public": False,
            "total_reports": 0,
            "last_reported_at": None,
        }

    h = int(hashlib.md5(ip_address.encode()).hexdigest(), 16)
    score = h % 101
    country = _MOCK_COUNTRIES[h % len(_MOCK_COUNTRIES)]
    isp = _MOCK_ISPS[h % len(_MOCK_ISPS)]
    reports = (h >> 8) % 500

    return {
        "ip": ip_address,
        "abuse_confidence_score": score,
        "country_code": country,
        "isp": isp,
        "is_public": True,
        "total_reports": reports,
        "last_reported_at": None,
    }
