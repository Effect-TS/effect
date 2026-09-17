---
"@effect/sql-sqlite-do": patch
---

Fix storage-backed Durable Object transactions hanging when Effect yields while another fiber is queued. Transactions can now complete without waiting for timers blocked by the Durable Object input gate.
