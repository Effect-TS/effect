---
"@effect/sql-pg": patch
---

Keep a leading U+FEFF in decoded text values, column names, `NOTIFY` payloads, and other protocol strings. It was dropped when the string also contained U+FFFD, and always on runtimes without `Buffer`.
