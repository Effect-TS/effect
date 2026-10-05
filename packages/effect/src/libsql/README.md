# Native remote libSQL

`LibsqlClient` implements the Hrana HTTP pipeline protocol with Effect's
`HttpClient`. It requires no `@libsql/client` dependency and works with Fetch,
Node and Bun HTTP client layers.

```ts
import { Effect, Layer, Redacted } from "effect"
import { FetchHttpClient } from "effect/http"
import { LibsqlClient } from "effect/libsql"

const Database = LibsqlClient.layer({
  url: "libsql://my-database.turso.io",
  authToken: Redacted.make("token"),
  intMode: "bigint"
}).pipe(Layer.provide(FetchHttpClient.layer))

const program = Effect.gen(function*() {
  const sql = yield* LibsqlClient.LibsqlClient
  return yield* sql`SELECT ${42} AS answer`
}).pipe(Effect.provide(Database))
```

`libsql:` URLs use HTTPS by default; `tls: false` selects HTTP. HTTP and HTTPS
URLs are also accepted. `protocolVersion` selects Hrana v2 (default) or v3.
Server-provided base URLs must retain the original origin before credentials
are forwarded. Each SQL connection owns a scoped server baton and closes it
when released. Transactions use `BEGIN IMMEDIATE`, keep the same baton, and
use savepoints for nested transactions. One connection serializes its requests;
`concurrency` limits simultaneous HTTP requests across connections (default 20,
zero disables the limit).

Parameters support null, strings, finite numbers, signed 64-bit bigints,
booleans, dates as epoch milliseconds, ArrayBuffer and typed array views.
Integer results use `number` by default and reject values outside the safe
number range. Choose `bigint` or `string` to preserve the full SQLite range.
Binary results are Uint8Array values. `.values` preserves column order; `.raw`
returns columns, types, rows, values, affected rows and a bigint last insert ID.
`.stream` emits a buffered statement result; it does not use the Hrana cursor
endpoint. `LibsqlMigrator` runs the shared transactional SQLite migrations.

Local `file:` databases, `:memory:`, WebSocket URLs, embedded replicas,
encryption and synchronization require an actual platform engine. Use the
existing `@effect/sql-sqlite-node` or `@effect/sql-sqlite-bun` adapter for local
databases, or `@effect/sql-libsql` when SDK replication is needed.
This remote client rejects unsupported URL schemes before making requests.
If an HTTP request is interrupted before its response delivers a new baton,
the reserved connection is retired and cannot run further statements. This
avoids reusing stale batons or a transaction whose outcome is unknown. The
server may retain that stream until its idle deadline; known batons are
closed on scope exit when cleanup can acquire the session; the five-second
cleanup deadline includes waiting for an in-flight request. SQL parser failures
use `SqlSyntaxError`. Constraint errors retain the server's code: generic
`SQLITE_CONSTRAINT` uses `ConstraintError`, while an explicit
`SQLITE_CONSTRAINT_UNIQUE` uses `UniqueViolation`.
