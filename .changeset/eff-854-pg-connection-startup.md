---
"@effect/sql-pg": patch
---

Add `PgConnection`, a native PostgreSQL session on the `PgProtocol` codec.

`PgConnection.make` connects over TCP, a unix socket, or a caller-supplied `Duplex` factory, optionally upgrades to TLS via `SSLRequest` (no silent downgrade), authenticates with trust, cleartext, MD5, or SCRAM-SHA-256, and resolves once the backend sends `ReadyForQuery`. Releasing the scope sends `Terminate` and destroys the socket. libpq-style `postgres://` URLs are parsed, with explicit config fields taking precedence.

This is the connection-startup slice only; queries, pooling, and the `PgClient` switchover land separately. `PgClient` still uses `pg` at runtime.
