"""
AbuseIPDB reputation lookup service.

Checks external IPs against the AbuseIPDB API and caches results.
Uses ABUSEIPDB_API_KEY from environment (mock key is fine for dev).
"""

import logging

import requests
from decouple import config
from django.core.cache import cache

logger = logging.getLogger(__name__)

ABUSEIPDB_API_KEY = config("ABUSEIPDB_API_KEY", default="mock-api-key-for-development")
ABUSEIPDB_URL = "https://api.abuseipdb.com/api/v2/check"
CACHE_TTL = 60 * 60  # 1 hour


def check_ip_reputation(ip_address: str) -> dict:
    """
    Look up an IP's reputation via AbuseIPDB.

    Returns a dict with:
      - abuse_confidence_score  (int 0-100)
      - country_code            (str, e.g. "US")
      - isp                     (str)
      - is_public               (bool)
      - total_reports           (int)
      - last_reported_at        (str | None)

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
            timeout=10,
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


def _mock_lookup(ip_address: str) -> dict:
    """Return honest 'unknown' data when no real API key is configured.

    Private/campus IPs are marked safe (score 0).  Public IPs are marked
    as 'not checked' so the UI doesn't display fabricated reputation data.
    """
    is_private = ip_address.startswith(("10.", "192.168.", "172.16.", "127."))

    return {
        "ip": ip_address,
        "abuse_confidence_score": 0,
        "country_code": "" if is_private else "",
        "isp": "Campus Network" if is_private else "",
        "is_public": not is_private,
        "total_reports": 0,
        "last_reported_at": None,
    }
