---
"@effect/sql-pg": patch
---

Support `sslmode=prefer` and `sslmode=allow` in connection URLs as aliases for `sslmode=require`, without plaintext fallback.
