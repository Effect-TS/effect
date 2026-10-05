---
"@effect/sql-pg": patch
---

Fix binary PostgreSQL interval decoding. Interval values preserve months, days, and bigint microseconds independently, with support for interval arrays and typed interval parameters.
