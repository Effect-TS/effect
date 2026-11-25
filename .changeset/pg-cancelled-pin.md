---
"@effect/sql-pg": patch
---

Fix interrupted connection pinning in `@effect/sql-pg` leaving subsequent queries waiting indefinitely.
