---
"@effect/sql-pg": patch
---

Preserve the PostgreSQL error when the server reports a FATAL error, such as a transaction timeout, and then closes the connection, instead of failing with a generic connection-closed error.
