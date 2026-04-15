#!/usr/bin/env python3
"""
Auto-creates a Campus Network Security dashboard in Kibana.

Run:  python3 setup_kibana.py
Then: http://localhost:5601  →  Analytics → Dashboards
"""

import json
import sys
import time
import uuid

import requests

KIBANA = "http://localhost:5601"
H = {"kbn-xsrf": "true", "Content-Type": "application/json"}


def uid():
    return str(uuid.uuid4())


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def wait_for_kibana(retries=20):
    print("Waiting for Kibana to be ready...")
    for i in range(retries):
        try:
            r = requests.get(f"{KIBANA}/api/status", timeout=5)
            if r.status_code == 200:
                print("  Kibana is ready.\n")
                return True
        except Exception:
            pass
        print(f"  Not ready yet ({i+1}/{retries}), retrying in 3s...")
        time.sleep(3)
    print("Kibana did not become ready in time.")
    return False


def get_or_create_data_view(title, time_field, name):
    r = requests.get(f"{KIBANA}/api/data_views", headers=H)
    if r.status_code == 200:
        for dv in r.json().get("data_view", []):
            if dv.get("title") == title:
                print(f"  [exists]  {name}  ({dv['id']})")
                return dv["id"]

    r = requests.post(f"{KIBANA}/api/data_views/data_view", headers=H, json={
        "data_view": {"title": title, "timeFieldName": time_field, "name": name}
    })
    if r.status_code == 200:
        dv_id = r.json()["data_view"]["id"]
        print(f"  [created] {name}  ({dv_id})")
        return dv_id
    print(f"  [FAILED]  {name}: {r.status_code} {r.text[:120]}")
    return None


# ---------------------------------------------------------------------------
# Visualization builders
# ---------------------------------------------------------------------------

def _xy(title, series_type, layer):
    """Generic XY (bar / area / line) Lens spec."""
    layer_id = uid()
    cols = layer["columns"]
    col_order = layer["columnOrder"]
    viz_layer = {
        "layerId": layer_id,
        "seriesType": series_type,
        "xAccessor": col_order[0],
        "accessors": [c for c in col_order if not cols[c].get("isBucketed")],
        "layerType": "data",
    }
    if len(col_order) == 3:                          # breakdown present
        viz_layer["splitAccessor"] = col_order[1]

    return {
        "title": title,
        "visualizationType": "lnsXY",
        "state": {
            "visualization": {
                "preferredSeriesType": series_type,
                "legend": {"isVisible": True, "position": "right"},
                "valueLabels": "hide",
                "fittingFunction": "None",
                "axisTitlesVisibilitySettings": {"x": True, "yLeft": True, "yRight": True},
                "tickLabelsVisibilitySettings": {"x": True, "yLeft": True, "yRight": True},
                "labelsOrientation": {"x": 0, "yLeft": 0, "yRight": 0},
                "gridlinesVisibilitySettings": {"x": True, "yLeft": True, "yRight": True},
                "layers": [viz_layer],
            },
            "query": {"language": "kuery", "query": ""},
            "filters": [],
            "datasourceStates": {
                "formBased": {
                    "layers": {layer_id: {**layer, "incompleteColumns": {}}}
                }
            },
            "internalReferences": [],
            "adHocDataViews": {},
        },
        "_layer_id": layer_id,
    }


def timeseries_count(title, series_type="bar_stacked", breakdown=None):
    col_x, col_y = uid(), uid()
    cols = {
        col_x: {
            "label": "@timestamp", "dataType": "date",
            "operationType": "date_histogram", "sourceField": "@timestamp",
            "isBucketed": True, "scale": "interval",
            "params": {"interval": "auto", "includeEmptyRows": True},
        },
        col_y: {
            "label": "Count", "dataType": "number",
            "operationType": "count", "isBucketed": False,
            "scale": "ratio", "sourceField": "___records___", "params": {},
        },
    }
    order = [col_x, col_y]
    if breakdown:
        col_b = uid()
        cols[col_b] = {
            "label": f"Top {breakdown}", "dataType": "string",
            "operationType": "terms", "sourceField": breakdown,
            "isBucketed": True, "scale": "ordinal",
            "params": {
                "size": 8,
                "orderBy": {"type": "column", "columnId": col_y},
                "orderDirection": "desc",
                "otherBucket": False, "missingBucket": False,
            },
        }
        order = [col_x, col_b, col_y]
    return _xy(title, series_type, {"columns": cols, "columnOrder": order})


def timeseries_sum(title, field, series_type="area_stacked", breakdown=None):
    col_x, col_y = uid(), uid()
    cols = {
        col_x: {
            "label": "@timestamp", "dataType": "date",
            "operationType": "date_histogram", "sourceField": "@timestamp",
            "isBucketed": True, "scale": "interval",
            "params": {"interval": "auto", "includeEmptyRows": True},
        },
        col_y: {
            "label": f"Sum of {field}", "dataType": "number",
            "operationType": "sum", "isBucketed": False,
            "scale": "ratio", "sourceField": field, "params": {},
        },
    }
    order = [col_x, col_y]
    if breakdown:
        col_b = uid()
        cols[col_b] = {
            "label": f"Top {breakdown}", "dataType": "string",
            "operationType": "terms", "sourceField": breakdown,
            "isBucketed": True, "scale": "ordinal",
            "params": {
                "size": 8,
                "orderBy": {"type": "column", "columnId": col_y},
                "orderDirection": "desc",
                "otherBucket": False, "missingBucket": False,
            },
        }
        order = [col_x, col_b, col_y]
    return _xy(title, series_type, {"columns": cols, "columnOrder": order})


def top_bar(title, group_field, horizontal=True, size=10):
    col_x, col_y = uid(), uid()
    series = "bar_horizontal" if horizontal else "bar"
    cols = {
        col_x: {
            "label": f"Top {group_field}", "dataType": "string",
            "operationType": "terms", "sourceField": group_field,
            "isBucketed": True, "scale": "ordinal",
            "params": {
                "size": size,
                "orderBy": {"type": "column", "columnId": col_y},
                "orderDirection": "desc",
                "otherBucket": False, "missingBucket": False,
            },
        },
        col_y: {
            "label": "Count", "dataType": "number",
            "operationType": "count", "isBucketed": False,
            "scale": "ratio", "sourceField": "___records___", "params": {},
        },
    }
    return _xy(title, series, {"columns": cols, "columnOrder": [col_x, col_y]})


def pie_chart(title, group_field, size=10):
    layer_id = uid()
    col_g, col_m = uid(), uid()
    return {
        "title": title,
        "visualizationType": "lnsPie",
        "state": {
            "visualization": {
                "shape": "donut",
                "layers": [{
                    "layerId": layer_id,
                    "primaryGroups": [col_g],
                    "metrics": [col_m],
                    "layerType": "data",
                    "numberDisplay": "percent",
                    "categoryDisplay": "default",
                    "legendDisplay": "default",
                    "nestedLegend": False,
                }],
            },
            "query": {"language": "kuery", "query": ""},
            "filters": [],
            "datasourceStates": {
                "formBased": {
                    "layers": {
                        layer_id: {
                            "columns": {
                                col_g: {
                                    "label": f"Top {group_field}", "dataType": "string",
                                    "operationType": "terms", "sourceField": group_field,
                                    "isBucketed": True, "scale": "ordinal",
                                    "params": {
                                        "size": size,
                                        "orderBy": {"type": "column", "columnId": col_m},
                                        "orderDirection": "desc",
                                        "otherBucket": True, "missingBucket": False,
                                    },
                                },
                                col_m: {
                                    "label": "Count", "dataType": "number",
                                    "operationType": "count", "isBucketed": False,
                                    "scale": "ratio", "sourceField": "___records___", "params": {},
                                },
                            },
                            "columnOrder": [col_g, col_m],
                            "incompleteColumns": {},
                        }
                    }
                }
            },
            "internalReferences": [],
            "adHocDataViews": {},
        },
        "_layer_id": layer_id,
    }


# ---------------------------------------------------------------------------
# Save to Kibana
# ---------------------------------------------------------------------------

def save_lens(spec, dv_id):
    viz_id = uid()
    layer_id = spec.pop("_layer_id")
    payload = {
        "attributes": {**spec, "description": ""},
        "references": [{
            "type": "index-pattern",
            "id": dv_id,
            "name": f"indexpattern-datasource-layer-{layer_id}",
        }],
    }
    r = requests.post(
        f"{KIBANA}/api/saved_objects/lens/{viz_id}", headers=H, json=payload
    )
    if r.status_code == 200:
        print(f"  [ok] {spec['title']}")
        return viz_id
    print(f"  [fail] {spec['title']}: {r.status_code} {r.text[:150]}")
    return None


def create_dashboard(title, panels):
    """panels: list of (viz_id, x, y, w, h)"""
    panel_list, refs = [], []
    for viz_id, x, y, w, h in panels:
        idx = uid()
        ref_name = f"panel_{idx}"
        panel_list.append({
            "type": "lens",
            "gridData": {"x": x, "y": y, "w": w, "h": h, "i": idx},
            "panelIndex": idx,
            "embeddableConfig": {"enhancements": {}},
            "panelRefName": ref_name,
        })
        refs.append({"name": ref_name, "type": "lens", "id": viz_id})

    dash_id = uid()
    r = requests.post(
        f"{KIBANA}/api/saved_objects/dashboard/{dash_id}", headers=H,
        json={
            "attributes": {
                "title": title,
                "description": "Live campus network security overview",
                "panelsJSON": json.dumps(panel_list),
                "optionsJSON": json.dumps({
                    "useMargins": True, "syncColors": True, "hidePanelTitles": False
                }),
                "timeRestore": True,
                "timeTo": "now",
                "timeFrom": "now-24h",
                "refreshInterval": {"pause": False, "value": 30000},
                "kibanaSavedObjectMeta": {
                    "searchSourceJSON": json.dumps({
                        "query": {"language": "kuery", "query": ""}, "filter": []
                    })
                },
            },
            "references": refs,
        },
    )
    if r.status_code == 200:
        print(f"  [ok] Dashboard: {title}  ({dash_id})")
        return dash_id
    print(f"  [fail] Dashboard: {r.status_code} {r.text[:300]}")
    return None


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    if not wait_for_kibana():
        sys.exit(1)

    # ── Data views ──────────────────────────────────────────────────────────
    print("Step 1 — Data views")
    flows_id  = get_or_create_data_view("network-flows-*",   "@timestamp", "Campus Network Flows")
    alerts_id = get_or_create_data_view("security-alerts-*", "@timestamp", "Campus Security Alerts")
    if not flows_id or not alerts_id:
        print("Cannot continue without data views.")
        sys.exit(1)

    # ── Visualizations ──────────────────────────────────────────────────────
    print("\nStep 2 — Visualizations")

    # Network flow panels
    v1 = save_lens(timeseries_sum(
        "Traffic Volume Over Time (bytes by protocol)",
        field="bytes", series_type="area_stacked", breakdown="proto"
    ), flows_id)

    v2 = save_lens(top_bar("Top 10 Source IPs",       "source_ip"),      flows_id)
    v3 = save_lens(top_bar("Top 10 Destination IPs",  "destination_ip"), flows_id)
    v4 = save_lens(pie_chart("Protocol Distribution", "proto"),           flows_id)
    v5 = save_lens(pie_chart("Traffic Direction",     "direction"),       flows_id)
    v6 = save_lens(top_bar("Connection States",       "conn_state",  horizontal=False), flows_id)

    # Security alert panels
    v7 = save_lens(timeseries_count(
        "Security Alerts Over Time (by category)",
        series_type="bar_stacked", breakdown="alert.category"
    ), alerts_id)

    v8  = save_lens(pie_chart("Alert Categories",       "alert.category"), alerts_id)
    v9  = save_lens(top_bar("Top Alert Source IPs",     "source_ip"),      alerts_id)
    v10 = save_lens(top_bar("Top Alert Signatures",     "alert.signature", size=8), alerts_id)

    # ── Dashboard layout  (grid: 48 columns wide) ───────────────────────────
    # Row 1: big traffic chart full width  (h=15)
    # Row 2: top src IPs | top dst IPs     (half + half, h=15)
    # Row 3: protocol pie | direction pie  (half + half, h=15)
    # Row 4: conn states full width        (h=12)
    # Row 5: alerts timeline full width    (h=15)
    # Row 6: alert categories | top alert src IPs (half + half, h=15)
    # Row 7: top signatures full width     (h=12)

    panels = [p for p in [
        (v1,  0,  0, 48, 15),
        (v2,  0, 15, 24, 15),
        (v3, 24, 15, 24, 15),
        (v4,  0, 30, 24, 15),
        (v5, 24, 30, 24, 15),
        (v6,  0, 45, 48, 12),
        (v7,  0, 57, 48, 15),
        (v8,  0, 72, 24, 15),
        (v9, 24, 72, 24, 15),
        (v10, 0, 87, 48, 12),
    ] if p[0]]  # skip any that failed

    print(f"\nStep 3 — Dashboard ({len(panels)} panels)")
    dash_id = create_dashboard("Campus Network Security Overview", panels)

    if dash_id:
        print(f"""
╔══════════════════════════════════════════════════════════╗
║  Done!  Open your dashboard here:                        ║
║                                                          ║
║  http://localhost:5601/app/dashboards#view/{dash_id[:8]}...  ║
║                                                          ║
║  Or go to:  http://localhost:5601                        ║
║             Analytics → Dashboards                       ║
║             "Campus Network Security Overview"           ║
╚══════════════════════════════════════════════════════════╝
""")
    else:
        print("\nDashboard creation failed — check errors above.")
        sys.exit(1)


if __name__ == "__main__":
    main()
