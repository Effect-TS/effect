---
"@effect/sql-pg": patch
---

Fix crash when pool.connect fails by ensuring client exists before attaching error handler
