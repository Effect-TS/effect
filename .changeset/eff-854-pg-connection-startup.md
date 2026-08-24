---
"@effect/sql-pg": patch
---

Add `PgConnection`, a native PostgreSQL session on the `PgProtocol` codec.

`PgConnection.make` connects over TCP, a unix socket, or a caller-supplied `Duplex` factory, optionally upgrades to TLS via `SSLRequest` (no silent downgrade), authenticates with trust, cleartext, MD5, or SCRAM-SHA-256, and resolves once the backend sends `ReadyForQuery`. Releasing the scope sends `Terminate` and destroys the socket. libpq-style `postgres://` URLs are parsed, with explicit config fields taking precedence.

`PgConnection.query` and `queryValues` run one unnamed extended-protocol cycle at a time with binary parameters and results. JavaScript parameters infer their PostgreSQL OIDs, while branded `PgTypes` parameters override inference. `PgTypes.makeRegistry()` provides isolated per-client custom codecs, including optional generic one-dimensional array codecs.

`PgConnection.stream` emits rows as they arrive, `listen` subscribes to `LISTEN`/`NOTIFY` notifications, and `interrupt` cancels the in-flight statement through a `CancelRequest` side connection. `pin` grants exclusive ownership of a session for transactions; `stream` and `listen` pin themselves for their lifetime.

`PgPool` pools `PgConnection` sessions with the familiar `maxConnections`, `minConnections`, `idleTimeout`, and `connectionTTL` settings: `get` checks a session out, `reserve` checks out and pins, and `invalidate` drops a dead session. Sessions that die from fatal protocol or socket errors are invalidated automatically.

`PgClient` now runs on the native pool and connection while retaining its SQL facade, transforms, JSON helpers, and
LISTEN/NOTIFY helpers. `makeClient` owns one native connection, while `make` uses `PgPool`. The old `fromPool`,
`fromClient`, and `makeWith` constructors have been removed along with the `pg` runtime dependencies.
