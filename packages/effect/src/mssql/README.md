# Native Microsoft SQL Server

`effect/mssql` implements the TDS wire protocol using `SocketConnector`.
It uses portable JavaScript and does not require `tedious` or Node APIs.
The existing `@effect/sql-mssql` package remains available separately.

```ts
import { NodeSocketConnector } from "@effect/platform-node"
import { Effect, Layer, Redacted } from "effect"
import { MssqlClient } from "effect/mssql"

const SqlLive = MssqlClient.layer({
  host: "sql.example.com",
  database: "app",
  username: "app",
  password: Redacted.make("secret"),
  maxConnections: 10
}).pipe(Layer.provide(NodeSocketConnector.layer))

const program = Effect.gen(function*() {
  const sql = yield* MssqlClient.MssqlClient
  return yield* sql.withTransaction(sql`SELECT ${42} AS answer`)
}).pipe(Effect.provide(SqlLive))
```

## Encryption and authentication

The default `encryption: "strict"` opens TLS before sending PRELOGIN, requests
ALPN `tds/8.0`, and uses TDS 8.0 LOGIN7. This requires SQL Server 2022 or another
server that supports strict encryption. Certificate verification uses the
connector's defaults; configure `tls.ca` for a private certificate authority.

TDS 7.x wraps its TLS handshake records inside PRELOGIN packets. The portable
socket upgrade contract does not support that framing, so this client rejects
negotiated legacy TLS before evaluating passwords or sending LOGIN7. It does
not fall back to an unencrypted connection.

Unencrypted TDS 7.4 requires both `encryption: "disable"` and
`allowPlaintext: true`, plus a server that accepts PRELOGIN `ENCRYPT_NOT_SUP`.
LOGIN7 password obfuscation does not protect passwords on that connection.

Only SQL authentication is supported. Passwords may be static `Redacted` values
or effects evaluated once per connection. Windows/NTLM/Kerberos authentication,
Azure AD/FedAuth, and server routing are unsupported. Connection startup has a
five-second timeout by default, configurable with `connectTimeout`.

## Queries, results, and sessions

Interpolated values are bound as native RPC parameters through
`sp_executesql`. Supported input types are Unicode strings, binary arrays,
floating-point numbers, signed bigint/int, booleans, dates as `datetime2(7)`,
and GUIDs. `MssqlClient.param` and `MssqlTypes.TYPES` select explicit types.
Unsupported input values fail before writing a request.

Result decoding supports integer, floating-point, decimal/numeric, money,
boolean, binary, string, GUID, XML, and date/time families. Decimal/numeric
results are strings to preserve precision; bigint results are `bigint`.
`time` results are seconds since midnight. SQL variant, CLR/UDT, and legacy
`text`/`ntext`/`image` result types are unsupported and fail explicitly.
Non-Unicode strings support UTF-8 and recognized Windows-1252 collations;
other non-Unicode code pages fail explicitly. Use `nvarchar` for portable text.
Raw results include column names, value arrays, affected row counts as bigint,
output parameters, procedure return status, and informational notices.

`Procedure` and `Parameter` provide typed stored procedure definitions and
output parameters. Procedure calls use the current transaction connection.
Transactions use `BEGIN/COMMIT/ROLLBACK TRANSACTION` and nested
`SAVE TRANSACTION` savepoints. TDS transaction descriptors are carried across
requests and reset by transaction ENVCHANGE responses.

Pools lease each connection exclusively, default to zero to ten sessions,
and retire idle sessions after sixty seconds. `makeClient` uses one serialized
session; transaction reservations keep other fibers from entering it.
Streams decode rows as packets arrive and apply socket read backpressure.
Ending a stream before its response finishes closes that session, and pools
replace it. Interrupting an in-flight query or encountering malformed protocol
data also retires the session rather than reusing unread results. `maxMessageSize`
limits startup messages and individual result tokens (16 MiB by default).

`MssqlMigrator` exposes the shared SQL migration loaders and runners.

## Validation

Protocol and fake-server tests cover fragmented packets/tokens, LOGIN7,
parameter encoding, typed row decoding, strict/plaintext negotiation,
transactions, stored procedure calls, concurrency, and abandoned streams.
Live SQL Server integration has not been run for this implementation.
