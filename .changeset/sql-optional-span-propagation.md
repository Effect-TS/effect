---
"effect": patch
---

Add an optional `propagateSpan` setting to `SqlClient.make` for drivers whose calls create child spans. When enabled, connection acquisition, statement execution, and stream pulls run under the `sql.execute` span without capturing a stack trace. Propagation defaults to off and is skipped when tracing is disabled.
