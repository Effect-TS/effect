---
"@effect/sql-pg": patch
---

Preserve stale prepared-statement errors (`0A000` or `26000`) in aborted transactions instead of masking them with a retry error (`25P02`).
