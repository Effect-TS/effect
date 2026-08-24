---
"@effect/sql-pg": patch
---

Add `PgConnection`, a native PostgreSQL session on the `PgProtocol` codec.

`PgConnection.make` connects over TCP, a unix socket, or a caller-supplied `Duplex` factory, optionally upgrades to TLS via `SSLRequest` (no silent downgrade), authenticates with trust, cleartext, MD5, or SCRAM-SHA-256, and resolves once the backend sends `ReadyForQuery`. Releasing the scope sends `Terminate` and destroys the socket. libpq-style `postgres://` URLs are parsed, with explicit config fields taking precedence.

`PgConnection.query` and `queryValues` run one unnamed extended-protocol cycle at a time with binary parameters and results. JavaScript parameters infer their PostgreSQL OIDs, while branded `PgTypes` parameters override inference. `PgTypes.makeRegistry()` provides isolated per-client custom codecs, including optional generic one-dimensional array codecs.

Pooling and the `PgClient` switchover land separately. `PgClient` still uses `pg` at runtime.
