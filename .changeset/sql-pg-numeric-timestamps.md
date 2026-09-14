---
"@effect/sql-pg": patch
---

Accept numeric Unix epoch milliseconds for `timestamp` and `timestamptz` parameters without casts or `PgTypes` wrappers, including fields using `Model.DateTimeInsertFromNumber`. Ordinary numeric parameters retain their existing inferred types.

For `timestamp without time zone`, numbers encode UTC wall-clock fields. JavaScript `Date` inputs retain their existing `timestamptz` binding, so PostgreSQL converts them to `timestamp` using the session `TimeZone`. For `timestamptz`, both represent the same instant.
