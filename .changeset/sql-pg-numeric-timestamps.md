---
"@effect/sql-pg": patch
---

Bind numbers to `timestamp` and `timestamptz` parameters without casts, as Unix epoch milliseconds, so fields using `Model.DateTimeInsertFromNumber` work against both column types.

The first time a statement with numeric parameters runs on a connection, the backend is asked which of them target a timestamp column; the answer is remembered per statement shape. Every other numeric parameter keeps its inferred type.

For `timestamp`, a number encodes the UTC wall-clock time of that instant. `Date` values still bind as `timestamptz`, so PostgreSQL converts them using the session `TimeZone`. For `timestamptz`, both represent the same instant.
