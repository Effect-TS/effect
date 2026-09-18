---
"@effect/sql-sqlite-do": patch
---

Prevent automatic scheduler yields inside storage-backed transactions to avoid Durable Object input-gate deadlocks when another fiber is queued. Explicit asynchronous operations inside transactions remain unsupported.
