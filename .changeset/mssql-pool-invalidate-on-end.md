---
"@effect/sql-mssql": patch
---

Invalidate pooled connections when Tedious closes them after a cancellation timeout so subsequent queries can use a replacement connection.
