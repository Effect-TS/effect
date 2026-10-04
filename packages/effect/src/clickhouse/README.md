# Native ClickHouse HTTP

`ClickhouseClient` uses Effect's `HttpClient` and has no dependency on
`@clickhouse/client` or Node streams. Provide a Fetch, Node or Bun HTTP layer.

```ts
import { Effect, Layer, Redacted } from "effect"
import { ClickhouseClient } from "effect/clickhouse"
import { FetchHttpClient } from "effect/http"

const Database = ClickhouseClient.layer({
  url: "https://clickhouse.example:8443",
  database: "analytics",
  username: "default",
  password: Redacted.make("password"),
  requestTimeout: "30 seconds"
}).pipe(Layer.provide(FetchHttpClient.layer))

const program = Effect.gen(function*() {
  const sql = yield* ClickhouseClient.ClickhouseClient
  return yield* sql`SELECT ${sql.param("UInt64", 42)} AS answer`
}).pipe(Effect.provide(Database))
```

Construction verifies `/ping`. Queries use typed `{pN: Type}` HTTP parameters:
numbers infer Float64, bigints Int64, booleans Bool, dates DateTime64(3), arrays
Array(element type), and null Nullable(String). Use `sql.param` to select exact
ClickHouse types, including nullable numeric types or array types for empty
arrays. `.values` uses JSONCompact, `.raw` returns decoded JSON metadata,
and `.stream` incrementally decodes JSONEachRow response bytes.

`sql.asCommand` runs DDL and commands without expecting a JSON result.
`sql.insertQuery` inserts object arrays as JSONEachRow or accepts an already
encoded `Stream<Uint8Array, SqlError>` with another ClickHouse format. Table and
column names are escaped. Empty object arrays produce `executed: false`.
`withQueryId` and `withClickhouseSettings` configure individual effects;
connection defaults can be supplied through `clickhouseSettings`.

Interrupted requests and streams attempt `KILL QUERY` using the query ID, with
a five-second cleanup deadline. Cancellation permissions are controlled by the
server. ClickHouse JSON settings determine whether large integers are returned
as strings. Queries buffer server results through `wait_end_of_query=1` by
default; streaming queries disable that buffering. Transaction attempts fail
with a typed SqlError because this client does not reserve ClickHouse sessions.

`ClickhouseMigrator` uses a MergeTree history table, runs migrations in order,
and records each successfully completed migration. Run one migrator at a time:
there is no unique constraint locking or transactional DDL rollback in this
runner. A migration failure may leave its earlier statements applied. Schema
dumps are unsupported and fail explicitly when requested.
