import json
from pathlib import Path
from datetime import datetime, timedelta

import requests
from decouple import config
from django.core.management.base import BaseCommand
from django.utils import timezone

from apps.threats.models import ThreatIntelligence
from config.settings import BASE_DIR


class Command(BaseCommand):
  help = (
      "Sync threat intelligence indicators from external sources (e.g. MISP, "
      "VirusTotal) into the ThreatIntelligence model and export a JSON file "
      "for Logstash enrichment."
  )

  def add_arguments(self, parser):
      parser.add_argument(
          "--days",
          type=int,
          default=7,
          help="How many days of recent indicators to fetch (if supported by the source).",
      )

  def handle(self, *args, **options):
      days = options["days"]
      since = timezone.now() - timedelta(days=days)

      self.stdout.write(
          self.style.SUCCESS(f"Syncing threat intelligence (last {days} days, since {since})")
      )

      indicators: list[dict] = []

      # In a real deployment, you would enable one or both of these fetchers
      # by providing the necessary environment variables / API keys.
      indicators.extend(self._fetch_from_misp(since))
      indicators.extend(self._fetch_from_virustotal(since))

      # De-duplicate by (ioc_type, ioc_value)
      unique: dict[tuple[str, str], dict] = {}
      for ioc in indicators:
          key = (ioc["ioc_type"], ioc["ioc_value"])
          if key not in unique or ioc.get("reputation_score", 0) > unique[key].get(
              "reputation_score", 0
          ):
              unique[key] = ioc

      upserted = 0
      for ioc in unique.values():
          obj, created = ThreatIntelligence.objects.update_or_create(
              ioc_type=ioc["ioc_type"],
              ioc_value=ioc["ioc_value"],
              defaults={
                  "threat_type": ioc.get("threat_type", "malware"),
                  "description": ioc.get("description", ""),
                  "reputation_score": ioc.get("reputation_score", 0),
                  "source": ioc.get("source", "Custom"),
                  "first_seen": ioc.get("first_seen", timezone.now()),
                  "last_seen": ioc.get("last_seen", timezone.now()),
                  "country_code": ioc.get("country_code"),
                  "latitude": ioc.get("latitude"),
                  "longitude": ioc.get("longitude"),
                  "tags": ioc.get("tags", []),
                  "metadata": ioc.get("metadata", {}),
                  "is_active": ioc.get("is_active", True),
              },
          )
          upserted += 1

      self.stdout.write(self.style.SUCCESS(f"Upserted {upserted} threat intel records"))

      # Export a compact IOC JSON file for Logstash enrichment
      export_path = Path(BASE_DIR) / "data" / "threat_iocs.json"
      export_path.parent.mkdir(parents=True, exist_ok=True)

      export_payload = [
          {
              "ioc_type": t.ioc_type,
              "ioc_value": t.ioc_value,
              "threat_type": t.threat_type,
              "reputation_score": t.reputation_score,
              "source": t.source,
          }
          for t in ThreatIntelligence.objects.filter(is_active=True)
      ]

      with export_path.open("w", encoding="utf-8") as f:
          json.dump(export_payload, f)

      self.stdout.write(self.style.SUCCESS(f"Exported {len(export_payload)} IOCs to {export_path}"))

  def _fetch_from_misp(self, since: datetime) -> list[dict]:
      """
      Fetch IOCs from a MISP instance, if MISP_URL and MISP_API_KEY are configured.

      This is a lightweight example; for a full implementation you might use
      the 'pymisp' library and more complex queries.
      """
      misp_url = config("MISP_URL", default="")
      misp_api_key = config("MISP_API_KEY", default="")

      if not misp_url or not misp_api_key:
          self.stdout.write("MISP_URL or MISP_API_KEY not set; skipping MISP sync.")
          return []

      headers = {
          "Authorization": misp_api_key,
          "Accept": "application/json",
          "Content-Type": "application/json",
      }

      # Very simplified: search for recent attributes
      payload = {
          "returnFormat": "json",
          "last": f"{(timezone.now() - since).days}d",
      }

      try:
          resp = requests.post(f"{misp_url.rstrip('/')}/attributes/restSearch", json=payload, headers=headers, timeout=30)
          resp.raise_for_status()
      except Exception as exc:
          self.stderr.write(f"Failed to fetch from MISP: {exc}")
          return []

      data = resp.json()
      indicators: list[dict] = []

      for attr in data.get("response", {}).get("Attribute", []):
          ioc_type = self._map_misp_type(attr.get("type", "ip-dst"))
          value = attr.get("value")
          if not value:
              continue

          indicators.append(
              {
                  "ioc_type": ioc_type,
                  "ioc_value": value,
                  "threat_type": "malware",
                  "description": attr.get("comment") or "MISP attribute",
                  "reputation_score": 80,
                  "source": "MISP",
                  "first_seen": timezone.now() - timedelta(days=7),
                  "last_seen": timezone.now(),
                  "tags": [t["name"] for t in attr.get("Tag", [])] if attr.get("Tag") else [],
                  "is_active": True,
              }
          )

      self.stdout.write(self.style.SUCCESS(f"Fetched {len(indicators)} indicators from MISP"))
      return indicators

  def _fetch_from_virustotal(self, since: datetime) -> list[dict]:
      """
      Very simple VirusTotal example for IPs/domains using VT API v3.
      In practice you'd drive this from a list of seeds; here we only run
      if VT_API_KEY is provided and treat this as an optional enrichment.
      """
      api_key = config("VT_API_KEY", default="")
      if not api_key:
          self.stdout.write("VT_API_KEY not set; skipping VirusTotal sync.")
          return []

      # Placeholder: in a real deployment you might iterate a list of
      # important IOCs or query a threat feed. Here we keep it minimal.
      seeds = config("VT_SEEDS", default="", cast=lambda v: [s for s in v.split(",") if s.strip()])
      if not seeds:
          self.stdout.write("VT_SEEDS not set; no seeds for VirusTotal queries.")
          return []

      headers = {"x-apikey": api_key}
      indicators: list[dict] = []

      for seed in seeds:
          seed = seed.strip()
          if not seed:
              continue

          try:
              resp = requests.get(f"https://www.virustotal.com/api/v3/ip_addresses/{seed}", headers=headers, timeout=30)
              if resp.status_code == 404:
                  continue
              resp.raise_for_status()
              data = resp.json()
          except Exception as exc:
              self.stderr.write(f"VirusTotal request failed for {seed}: {exc}")
              continue

          reputation = data.get("data", {}).get("attributes", {}).get("reputation", 0)
          indicators.append(
              {
                  "ioc_type": "ip",
                  "ioc_value": seed,
                  "threat_type": "malware",
                  "description": "VirusTotal reputation lookup",
                  "reputation_score": max(0, min(100, reputation + 50)),
                  "source": "VirusTotal",
                  "first_seen": timezone.now() - timedelta(days=30),
                  "last_seen": timezone.now(),
                  "is_active": True,
              }
          )

      self.stdout.write(self.style.SUCCESS(f"Fetched {len(indicators)} indicators from VirusTotal"))
      return indicators

  @staticmethod
  def _map_misp_type(attr_type: str) -> str:
      """
      Map MISP attribute types to our IOC_TYPE_CHOICES.
      """
      mapping = {
          "ip-src": "ip",
          "ip-dst": "ip",
          "ip-dst|port": "ip",
          "ip-src|port": "ip",
          "domain": "domain",
          "hostname": "domain",
          "url": "url",
          "uri": "url",
          "md5": "hash",
          "sha1": "hash",
          "sha256": "hash",
          "email-src": "email",
          "email-dst": "email",
      }
      return mapping.get(attr_type, "ip")


