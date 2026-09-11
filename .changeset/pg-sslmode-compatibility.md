---
"@effect/sql-pg": patch
---

Accept connection URLs containing `sslmode=prefer` or `sslmode=allow` by enabling TLS. These modes use the same behavior as `sslmode=require`, without libpq fallback between TLS and plaintext. Explicit `ssl` options continue to override the URL mode.
