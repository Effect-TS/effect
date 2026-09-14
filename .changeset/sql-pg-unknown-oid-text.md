---
"@effect/sql-pg": patch
---

Decode columns whose OID has no registered codec as UTF-8 text instead of raw bytes, so user-defined enums read as their labels. `bytea` and every other built-in or registered codec are unchanged, and there is no encode-path change.

The fallback applies to every unregistered OID. Invalid UTF-8 fails with `CodecError`, as it does for `text`, and a codec failure while reading a row is fatal to the connection: the socket is destroyed, every other query pipelined on it fails, an open transaction is lost, `LISTEN` channels on it are torn down, and the pool replaces the connection. Columns of binary user-defined types (composites, PostGIS, pgvector) that previously came back as `Uint8Array` now hit this, so register a codec for them before querying. Unregistered array OIDs, including enum arrays, decode as garbled text rather than failing. Use `PgTypes.register` for scalar user-defined types; for arrays, register the element codec on a `PgTypes.makeRegistry()` registry with `arrayOid` and pass it to the client as `types`.
