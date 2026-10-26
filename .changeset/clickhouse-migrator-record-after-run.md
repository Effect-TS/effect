---
"effect": patch
---

Record ClickHouse migrations only after they succeed, so a failed migration and the ones after it are retried on the next run.
