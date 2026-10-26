---
"effect": patch
---

Fix `ClickhouseMigrator` recording migrations as applied before running them, so a failed migration and the ones after it are retried on the next run.
