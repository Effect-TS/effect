---
"@effect/sql-pg": minor
---

Add a PostgreSQL wire protocol codec to `@effect/sql-pg`.

Three new modules cover the client side of protocol 3.0 as pure functions, with no `Effect`, `Schema`, or `Stream` in their signatures:

- `PgProtocol` encodes frontend messages, decodes backend messages, and exposes an incremental parser (`makeParser().push(chunk)`) that buffers partial messages and caps message size at 16 MiB by default. `DataRow` fields stay raw bytes.
- `PgTypes` encodes and decodes binary values by OID, covering the built-in scalar types and their one-dimensional arrays, with a registry for additional OIDs.
- `PgAuth` implements MD5 and SCRAM-SHA-256 password authentication.

`PgClient` is unchanged and still uses `pg` at runtime.
