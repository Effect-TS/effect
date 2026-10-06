---
"@effect/sql-pg": patch
---

Report a stale prepared statement inside a transaction as its own error (`0A000` or `26000`) instead of retrying it in the aborted transaction, where the retry failed with `25P02`.
