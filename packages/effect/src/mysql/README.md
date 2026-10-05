# Native MySQL

`effect/mysql` implements the MySQL wire protocol using the portable
`SocketConnector` and `Crypto` services. It does not depend on `mysql2` or Node.js.

```ts
import { NodeCrypto, NodeSocketConnector } from "@effect/platform-node"
import { Effect, Layer, Redacted } from "effect"
import { MysqlClient } from "effect/mysql"

const Database = MysqlClient.layer({
  host: "localhost",
  username: "app",
  database: "app",
  password: Redacted.make("secret"),
  ssl: true
}).pipe(Layer.provide(Layer.merge(NodeSocketConnector.layer, NodeCrypto.layer)))

const program = Effect.gen(function*() {
  const sql = yield* MysqlClient.MysqlClient
  const rows = yield* sql<{ answer: number }>`SELECT ${42} AS answer`
  return rows[0].answer
}).pipe(Effect.provide(Database))
```

Queries use binary prepared statements by default. Every statement is closed
when its query or stream finishes. `disablePreparedStatements: true` and the
shared client's unprepared operations use the text protocol. Text parameters
are encoded as hex literals, avoiding SQL mode dependent string escaping.
Identifiers use the shared MySQL statement compiler.

The SQL client supports transactions, nested savepoints, reserved connections,
row objects, value arrays, raw command metadata, name transforms, and streams
that pull rows on demand. Pools lend sessions exclusively and replace failed
sessions; connection count, idle timeout, and connection lifetime are configurable.
Multiple result sets from stored procedures are drained and their rows are
flattened in server order; raw metadata describes the first result's columns
and the final command's affected rows, insert ID and warning count.

`mysql_native_password`, `caching_sha2_password`, and `sha256_password`
authentication use the portable Crypto service. TLS uses the protocol's SSL
request and upgrades the existing socket before sending a password. Without TLS,
SHA password authentication encrypts the salted password with RSA-OAEP SHA-1.
Set `serverPublicKey` to the trusted server's RSA public key as SPKI or PKCS1 PEM
or DER. Alternatively, `allowPublicKeyRetrieval: true` explicitly permits
retrieving and trusting a key from the server over the connection. Retrieval is
disabled by default; pinned keys avoid trusting an unauthenticated key exchange.
The Crypto provider must support RSA-OAEP for this authentication path.
Authentication switches are supported for these plugins. Other plugins fail
with `AuthenticationError`. Authentication and password providers run under
`connectTimeout` (10 seconds by default); failure closes the socket.

Numbers larger than JavaScript's safe integer range are returned as strings.
Decimal values remain strings, JSON values are parsed, binary strings and BLOBs
are byte arrays, date/datetime/timestamp values use local `Date` values, and TIME
values are strings. Parameter dates use the same local timezone interpretation.

Interrupting an active query or abandoning a stream retires its physical
session. Failed SQL commands preserve structured error reasons and their
server error number and SQLSTATE. Commands are never automatically replayed.
LOCAL INFILE requests are disabled. The client does not enable multiple SQL
statements in one command or offer mysql2-specific custom driver options.

`MysqlConnection.make` exposes a scoped physical session, `MysqlPool.make`
exposes exclusive scoped checkout, and `MysqlMigrator` connects the shared SQL
migration runner to the native SQL client.
