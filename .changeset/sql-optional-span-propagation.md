---
"effect": patch
---

Add a `propagateSpan` option to `SqlClient.make` for parenting driver spans under `sql.execute`. Disabled by default.
