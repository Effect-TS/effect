---
"@effect/sql-pg": patch
---

Add a PostgreSQL wire protocol codec to `@effect/sql-pg`.

Three new modules cover the client side of protocol 3.0 as pure functions, with no `Effect`, `Schema`, or `Stream` in their signatures:

- `PgProtocol` encodes frontend messages, decodes backend messages, and exposes an incremental parser (`makeParser().push(chunk)`) that buffers partial messages and caps message size at 16 MiB by default. `DataRow` fields stay raw bytes.
- `PgTypes` encodes and decodes binary values by OID, covering the built-in scalar types and their one-dimensional arrays, with a registry for additional OIDs.
- `PgAuth` implements MD5 and SCRAM-SHA-256 password authentication.

`PgProtocol` writes encoded frames into a pooled buffer and reads messages out of the parser's own buffer, so an encoded frame and the byte fields of a decoded message (`DataRow` values, `CopyData` and `Unknown` payloads) are views rather than copies. Those buffers are written once and never rewritten, so a view stays valid for as long as it is held, but holding one keeps its whole buffer alive - copy anything that has to outlive the message it came from.

For the hot path, `PgProtocol.makeBindEncoder(PgTypes.writeParameter)` builds a `Bind` encoder that takes OID-typed parameters and writes their values straight into the frame, with no array per parameter and no copy out of one. `PgProtocol.encodeBind` still takes already-encoded parameters and produces the same bytes. A codec can supply the optional `Codec.write` to join that path; one without it falls back to `encode` and a copy. A value that contains other values frames them with the sink's `beginLength` and `endLength`, which is how array parameters write their elements in place.

A parser's buffer starts at 8 KiB and doubles up to 64 KiB as it is refilled, so a busy connection spreads its allocations over more messages. A message larger than that gets a buffer of its own size, which the pool does not keep.

`PgClient` is unchanged and still uses `pg` at runtime.
