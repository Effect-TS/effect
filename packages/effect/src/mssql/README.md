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
server with TDS 8.0 support. Certificate verification uses the
connector's defaults; configure `tls.ca` for a private certificate authority.
Strict connections require the connector's `setTlsMaxSendFragment` writer
capability to cap TLS records to the TDS packet size. The Node, Bun, and Deno
socket connectors provide it; custom connectors must provide it too. Missing support fails
before PRELOGIN or password evaluation. The cap is updated when the server
changes the packet size.

Set `encryption: "mandatory"` for encrypted TDS 7.4 connections, including older
SQL Server versions and SQL Server 2022 on Linux. The client requests encryption in PRELOGIN, wraps the TLS
handshake inside TDS packets, verifies the server certificate, and then sends
LOGIN7 and queries over TLS. Its socket connector must support the portable
`handshakeFraming` TLS upgrade option; Node, Bun, and Deno connectors provide it.
Refused encryption or failed certificate verification fails before evaluating
passwords. Selecting mandatory encryption is explicit; a failed strict
connection never retries with another encryption mode.

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

The opt-in integration suite has passed all six tests against SQL Server
2025 (17.0.4075.5) using strict TDS 8.0, TLS 1.2, ALPN `tds/8.0`, and a verified
private CA-signed certificate. The same six tests passed against SQL Server
2022 (16.0.4295.3) using mandatory TDS 7.4 TLS with certificate verification.
Independent server queries confirmed encryption on both versions. They cover bound
values, large Unicode parameters spanning multiple packets, nested transactions,
live row streaming, abandoned pooled streams, datetimeoffset decoding, and
stored procedure output parameters inside a transaction, and certificate hostname
rejection before evaluating credentials.

Run against a disposable database with a SQL-authenticated user:

```sh
EFFECT_INTEGRATION_TESTS=1 MSSQL_TEST_HOST=localhost \
  MSSQL_TEST_USERNAME=sa MSSQL_TEST_PASSWORD=... MSSQL_TEST_DATABASE=tempdb \
  MSSQL_TEST_PROCEDURES=1 \
  pnpm test --run packages/effect/test/mssql/MssqlClient.integration.test.ts
```

Strict TLS is the default. Set `MSSQL_TEST_CA` to the contents of the issuing
PEM certificate authority and `MSSQL_TEST_SERVERNAME` when the certificate's
hostname differs from the connection host. `MSSQL_TEST_PORT` defaults to 1433.
Set `MSSQL_TEST_ENCRYPTION=mandatory` to exercise TDS 7.4 TLS.
The procedure test requires permission to create temporary stored procedures;
omit `MSSQL_TEST_PROCEDURES=1` to skip it. To exercise plaintext on an isolated
server configured to accept it, explicitly set `MSSQL_TEST_PLAINTEXT=1`.
