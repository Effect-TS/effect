---
"@effect/sql-pg": patch
---

Decode `timestamp` and `timestamptz` values, including array elements, as `Date` instead of epoch milliseconds. Their encoders, including `PgTypes.timestamp` and `PgTypes.timestamptz`, accept either form. Precision remains milliseconds.

### Breaking changes

- Numeric readers must call `date.getTime()` or restore numeric codecs with `PgTypes.register` or a client `Registry` passed as `types`.
- `infinity`, `-infinity` and values outside the JavaScript `Date` range decode to an invalid `Date`. Numeric `±Infinity` still encodes PostgreSQL's sentinels; encoding an invalid `Date` fails with `PgTypes.CodecError`.

Date parameters bind as `timestamptz`. Inserting one into a `timestamp` column applies the session `TimeZone`. Use UTC or `PgTypes.timestamp(value)` to preserve its UTC fields. `timestamptz` round trips preserve the instant regardless of session timezone.
