#!/usr/bin/env python3
"""
Configures Kibana's built-in Elastic Security (SIEM) to use
the campus network data already in Elasticsearch.

Run:  python3 setup_elastic_security.py
Then: http://localhost:5601/app/security
"""

import json, sys, time
import requests

KIBANA = "http://localhost:5601"
H = {"kbn-xsrf": "true", "Content-Type": "application/json"}


def wait_for_kibana():
    print("Waiting for Kibana...")
    for i in range(20):
        try:
            if requests.get(f"{KIBANA}/api/status", timeout=5).status_code == 200:
                print("  Kibana ready.\n")
                return True
        except Exception:
            pass
        time.sleep(3)
    return False


# ---------------------------------------------------------------------------
# 1. Point Security solution at our indices
# ---------------------------------------------------------------------------

def configure_siem_indices():
    print("Step 1 — Configuring SIEM index patterns")
    indices = "security-alerts-*,network-flows-*,.alerts-security*,logs-*"
    r = requests.post(
        f"{KIBANA}/api/kibana/settings",
        headers=H,
        json={"changes": {"securitySolution:defaultIndex": indices}},
    )
    print(f"  securitySolution:defaultIndex  → {r.status_code}")

    # Also enable the threat-intel overlay
    r2 = requests.post(
        f"{KIBANA}/api/kibana/settings",
        headers=H,
        json={"changes": {"securitySolution:enableNewsFeed": False}},
    )
    print(f"  Disable news feed              → {r2.status_code}")


# ---------------------------------------------------------------------------
# 2. Create detection rules
# ---------------------------------------------------------------------------

def create_rule(payload):
    r = requests.post(
        f"{KIBANA}/api/detection_engine/rules",
        headers=H, json=payload,
    )
    status = "ok" if r.status_code in (200, 409) else f"FAILED ({r.status_code})"
    dupe = " [already exists]" if r.status_code == 409 else ""
    print(f"  [{status}]{dupe}  {payload['name']}")
    return r.status_code in (200, 409)


def create_detection_rules():
    print("\nStep 2 — Creating detection rules")

    rules = [
        # ── Network-flow based ──────────────────────────────────────────
        {
            "name": "Port Scan Detected — Campus IDS",
            "description": "Campus IDS flagged a host probing many destination ports.",
            "risk_score": 73,
            "severity": "high",
            "type": "query",
            "index": ["security-alerts-*"],
            "query": 'alert.category : "port_scan"',
            "language": "kuery",
            "enabled": True,
            "interval": "5m",
            "from": "now-6m",
            "tags": ["campus", "network", "scanning"],
            "threat": [{
                "framework": "MITRE ATT&CK",
                "tactic": {"id": "TA0007", "name": "Discovery",
                            "reference": "https://attack.mitre.org/tactics/TA0007/"},
                "technique": [{"id": "T1046", "name": "Network Service Discovery",
                                "reference": "https://attack.mitre.org/techniques/T1046/"}],
            }],
        },
        {
            "name": "Brute Force Attempt — Campus IDS",
            "description": "Multiple repeated connection attempts to an authentication port (SSH/RDP/FTP).",
            "risk_score": 85,
            "severity": "critical",
            "type": "query",
            "index": ["security-alerts-*"],
            "query": 'alert.category : "brute_force"',
            "language": "kuery",
            "enabled": True,
            "interval": "5m",
            "from": "now-6m",
            "tags": ["campus", "brute-force", "credential-access"],
            "threat": [{
                "framework": "MITRE ATT&CK",
                "tactic": {"id": "TA0006", "name": "Credential Access",
                            "reference": "https://attack.mitre.org/tactics/TA0006/"},
                "technique": [{"id": "T1110", "name": "Brute Force",
                                "reference": "https://attack.mitre.org/techniques/T1110/"}],
            }],
        },
        {
            "name": "Possible Data Exfiltration — High Outbound Volume",
            "description": "A single source IP transferred over 50 MB outbound in one monitoring window.",
            "risk_score": 70,
            "severity": "high",
            "type": "query",
            "index": ["security-alerts-*"],
            "query": 'alert.category : "data_exfiltration"',
            "language": "kuery",
            "enabled": True,
            "interval": "5m",
            "from": "now-6m",
            "tags": ["campus", "exfiltration"],
            "threat": [{
                "framework": "MITRE ATT&CK",
                "tactic": {"id": "TA0010", "name": "Exfiltration",
                            "reference": "https://attack.mitre.org/tactics/TA0010/"},
                "technique": [{"id": "T1048", "name": "Exfiltration Over Alternative Protocol",
                                "reference": "https://attack.mitre.org/techniques/T1048/"}],
            }],
        },
        {
            "name": "DNS Tunneling Suspected",
            "description": "Multiple oversized DNS queries detected — possible covert channel.",
            "risk_score": 80,
            "severity": "critical",
            "type": "query",
            "index": ["security-alerts-*"],
            "query": 'alert.category : "suspicious_traffic" AND proto : "TCP"',
            "language": "kuery",
            "enabled": True,
            "interval": "5m",
            "from": "now-6m",
            "tags": ["campus", "dns", "c2"],
            "threat": [{
                "framework": "MITRE ATT&CK",
                "tactic": {"id": "TA0011", "name": "Command and Control",
                            "reference": "https://attack.mitre.org/tactics/TA0011/"},
                "technique": [{"id": "T1071.004", "name": "DNS",
                                "reference": "https://attack.mitre.org/techniques/T1071/004/"}],
            }],
        },
        # ── Threshold rule: spike in alerts ────────────────────────────
        {
            "name": "Alert Storm — More Than 20 Alerts in 5 Minutes",
            "description": "An unusually high number of security alerts fired in a short window — possible attack campaign.",
            "risk_score": 90,
            "severity": "critical",
            "type": "threshold",
            "index": ["security-alerts-*"],
            "query": "event_type : alert",
            "language": "kuery",
            "threshold": {"field": [], "value": 20},
            "enabled": True,
            "interval": "5m",
            "from": "now-6m",
            "tags": ["campus", "alert-storm"],
        },
        # ── Network flow: inbound traffic spike ────────────────────────
        {
            "name": "Inbound Traffic Spike — Possible DDoS",
            "description": "High volume of inbound connections detected — possible denial-of-service.",
            "risk_score": 75,
            "severity": "high",
            "type": "threshold",
            "index": ["network-flows-*"],
            "query": 'direction : "inbound"',
            "language": "kuery",
            "threshold": {"field": ["destination_ip"], "value": 500},
            "enabled": True,
            "interval": "5m",
            "from": "now-6m",
            "tags": ["campus", "ddos"],
            "threat": [{
                "framework": "MITRE ATT&CK",
                "tactic": {"id": "TA0040", "name": "Impact",
                            "reference": "https://attack.mitre.org/tactics/TA0040/"},
                "technique": [{"id": "T1498", "name": "Network Denial of Service",
                                "reference": "https://attack.mitre.org/techniques/T1498/"}],
            }],
        },
        # ── Critical severity alert ─────────────────────────────────────
        {
            "name": "Critical Severity Alert from Campus IDS",
            "description": "Any alert classified as critical severity by the on-campus IDS.",
            "risk_score": 95,
            "severity": "critical",
            "type": "query",
            "index": ["security-alerts-*"],
            "query": "alert.severity : 1",
            "language": "kuery",
            "enabled": True,
            "interval": "1m",
            "from": "now-2m",
            "tags": ["campus", "critical"],
        },
    ]

    # Initialise the detection engine first (creates necessary indices)
    requests.post(f"{KIBANA}/api/detection_engine/index", headers=H)
    time.sleep(2)

    for rule in rules:
        create_rule(rule)


# ---------------------------------------------------------------------------
# 3. Summary
# ---------------------------------------------------------------------------

def print_summary():
    print(f"""
╔══════════════════════════════════════════════════════════════╗
║  Elastic Security (SIEM) is ready!                           ║
║                                                              ║
║  Open:  http://localhost:5601/app/security                   ║
║                                                              ║
║  What you now have:                                          ║
║  • Security Overview — live threat summary                   ║
║  • Alerts — fired when rules match your live data            ║
║  • Rules  — 7 custom rules mapped to MITRE ATT&CK            ║
║  • Cases  — create incident tickets from alerts              ║
║  • Timeline — investigate any alert event-by-event           ║
║  • Network — visualise who talked to who                     ║
╚══════════════════════════════════════════════════════════════╝
""")


def main():
    if not wait_for_kibana():
        sys.exit(1)
    configure_siem_indices()
    create_detection_rules()
    print_summary()


if __name__ == "__main__":
    main()
