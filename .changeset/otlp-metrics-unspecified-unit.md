---
"effect": patch
---

Fix `OtlpMetrics` exporting metrics without a declared unit as dimensionless (`"1"`); they now export an empty unit.

Prometheus-compatible backends no longer append `_ratio` to these gauge names (for example, `app_build_info_ratio` becomes `app_build_info`). Update affected queries and alerts, or set `attributes: { unit: "1" }` on the metric to keep the previous name.
