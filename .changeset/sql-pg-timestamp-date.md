---
"@effect/sql-pg": patch
---

Decode `timestamp` and `timestamptz` columns, and their arrays, as `Date` instead of Unix epoch milliseconds. Reads now match writes: a `Date` parameter already binds as `timestamptz`, so a decoded value round-trips through `Model.DateTimeInsertFromDate` the way it does with pglite and mysql2, and `Migrator` returns the `Date` it declares for `createdAt`.

### Breaking changes

- Code that reads these columns as numbers must call `getTime()` on the `Date`, or keep numeric decoding by overriding the built-in codecs with `PgTypes.register` or a client `Registry` passed as `types`.
- `infinity` and `-infinity` decode to an invalid `Date` (`Number.isNaN(date.getTime())`) instead of `Infinity` and `-Infinity`. Encoding numeric `Infinity` and `-Infinity` still produces the PostgreSQL sentinels; encoding an invalid `Date` fails with `PgTypes.CodecError`.

`PgTypes.timestamp` and `PgTypes.timestamptz` now accept a `Date` as well as milliseconds. Precision stays at milliseconds.

A `Date` binds as `timestamptz`, so assigning it to a `timestamp` (no zone) column converts it through the session `TimeZone`. Round trips are exact for `timestamptz`, and for `timestamp` when the session runs in UTC; use `PgTypes.timestamp(value)` to bind a `timestamp` exactly in any session.
