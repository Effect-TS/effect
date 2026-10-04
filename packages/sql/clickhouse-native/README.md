# @effect/sql-clickhouse

An Effect SQL client for [ClickHouse](https://clickhouse.com).

## Installation

```sh
npm install effect@rc @effect/sql-clickhouse-native@rc
```

## Documentation

- [Effect website](https://effect.website)
- [API reference](https://effect.website/docs/v4/api/sql-clickhouse-native)

## ClickHouse Native TCP protocol support

`ClickHouseNativeClient` is a direct TCP client for ClickHouse's Native protocol. It does not use
the HTTP interface. The client currently advertises protocol revision **54464**
(`DBMS_TCP_PROTOCOL_VERSION_TIMEZONE_UPDATES`).

This document describes the implemented surface, not every feature available in ClickHouse at that
revision.

### Implemented packets

| Direction | Number | Packet           | Driver behavior                                                                                                   |
| --------- | -----: | ---------------- | ----------------------------------------------------------------------------------------------------------------- |
| Client    |      0 | `Hello`          | Sends client name, version, revision, database, user, and password.                                               |
| Client    |      1 | `Query`          | Sends a SQL query, settings, client info, and query parameters.                                                   |
| Client    |      2 | `Data`           | Sends INSERT blocks and the required empty block terminator.                                                      |
| Client    |      4 | `Ping`           | Sends a Native ping; `ClickHouseNativeClient.ping` awaits `Pong`.                                                 |
| Server    |      0 | `Hello`          | Reads server version, revision, timezone, display name, patch version, password rules, and nonce when applicable. |
| Server    |      1 | `Data`           | Reads result blocks and INSERT sample blocks.                                                                     |
| Server    |      2 | `Exception`      | Converts server exceptions to Effect SQL errors.                                                                  |
| Server    |      3 | `Progress`       | Reads rows, bytes, totals, written values, and elapsed nanoseconds supported by revision 54464.                   |
| Server    |      4 | `Pong`           | Completes a ping.                                                                                                 |
| Server    |      5 | `EndOfStream`    | Completes a query result.                                                                                         |
| Server    |      6 | `ProfileInfo`    | Consumes profile information while reading a result.                                                              |
| Server    |      7 | `Totals`         | Reads totals blocks.                                                                                              |
| Server    |      8 | `Extremes`       | Reads extremes blocks.                                                                                            |
| Server    |     10 | `Log`            | Consumes server log blocks.                                                                                       |
| Server    |     11 | `TableColumns`   | Reads table-column metadata for INSERT.                                                                           |
| Server    |     14 | `ProfileEvents`  | Consumes profile-event blocks.                                                                                    |
| Server    |     17 | `TimezoneUpdate` | Reads session timezone updates and exposes the observed values in query metadata.                                 |

The socket also enables TCP keepalive with Node's `socket.setKeepAlive(true)`. This is transport
keepalive, distinct from Native protocol packet `Client::KeepAlive`.

### Implemented revision-54464 fields

The 54464 revision adds framing fields that must be read correctly even when the application does
not otherwise use their data:

| Revision | Feature                                    | Status                    |
| -------: | ------------------------------------------ | ------------------------- |
|    54458 | Server addendum / quota-key framing        | Implemented.              |
|    54459 | Query parameters                           | Implemented.              |
|    54460 | Query elapsed time in `Progress`           | Implemented.              |
|    54461 | Password-complexity rules in `ServerHello` | Implemented and consumed. |
|    54462 | Interserver nonce field in `ServerHello`   | Implemented and consumed. |
|    54463 | Total bytes in `Progress`                  | Implemented.              |
|    54464 | `TimezoneUpdate` packet                    | Implemented.              |

### Not implemented

The following Native Protocol packets are deliberately reported as unsupported by
`ClickHouseNativeProtocolCoverage.test.ts`.

| Direction | Number | Packet                                   | Why it is unsupported                                                                                                                |
| --------- | -----: | ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| Client    |      3 | `Cancel`                                 | Requires a duplex query state machine that can write `Cancel` while the same connection continues draining packets to `EndOfStream`. |
| Client    |      5 | `TablesStatusRequest`                    | Interserver table-status operation; not part of the SQL client flow.                                                                 |
| Client    |      6 | `KeepAlive`                              | Not emitted by the driver. TCP keepalive and `Ping` cover client liveness.                                                           |
| Client    |      7 | `Scalar`                                 | Distributed-query scalar transfer; not required for ordinary SQL queries.                                                            |
| Client    |      8 | `IgnoredPartUUIDs`                       | Obsolete query-deduplication mechanism; rejected by current ClickHouse servers.                                                      |
| Client    |      9 | `ReadTaskResponse`                       | Distributed storage-read protocol.                                                                                                   |
| Client    |     10 | `MergeTreeReadTaskResponse`              | Distributed MergeTree read protocol.                                                                                                 |
| Client    |     11 | `SSHChallengeRequest`                    | SSH authentication protocol.                                                                                                         |
| Client    |     12 | `SSHChallengeResponse`                   | SSH authentication protocol.                                                                                                         |
| Client    |     13 | `QueryPlan`                              | Distributed query-plan exchange.                                                                                                     |
| Client    |     14 | `MergeTreeAllRangesAnnouncementResponse` | Distributed MergeTree protocol.                                                                                                      |
| Server    |      9 | `TablesStatusResponse`                   | Response to interserver table-status requests.                                                                                       |
| Server    |     12 | `PartUUIDs`                              | Distributed part-UUID exchange.                                                                                                      |
| Server    |     13 | `ReadTaskRequest`                        | Distributed storage-read protocol.                                                                                                   |
| Server    |     15 | `MergeTreeAllRangesAnnouncement`         | Distributed MergeTree protocol.                                                                                                      |
| Server    |     16 | `MergeTreeReadTaskRequest`               | Distributed MergeTree read protocol.                                                                                                 |
| Server    |     18 | `SSHChallenge`                           | SSH authentication protocol.                                                                                                         |

### Later protocol revisions

The driver intentionally stops at revision 54464. Newer revisions must not be advertised until
their conditional fields and codecs are implemented. In particular, this includes sparse and
nullable sparse serialization, Dynamic/JSON serialization, server settings, client-agent and
internal-query client-info fields, compressed log/profile-event columns, and string-with-size
stream serialization.

Several newer protocol features are also server-to-server or interserver-only features, including
SSH authentication, table-status checks, distributed read tasks, parallel-replica coordination,
query-plan exchange, and interserver roles/secrets. They are out of scope for this direct SQL
client unless its role expands beyond a normal ClickHouse client connection.

### Verification

Protocol coverage is maintained in
[`ClickHouseNativeProtocolCoverage.test.ts`](test/ClickHouseNativeProtocolCoverage.test.ts). The
native integration suite verifies authentication, `Ping`, SELECT results, INSERT metadata,
server-error mapping, and revision-54464 session behavior in
[`ClickHouseNativeClient.integration.test.ts`](test/ClickHouseNativeClient.integration.test.ts).

Run the package suite with:

```sh
pnpm --filter @effect/sql-clickhouse-native test
```

Run the Native integration suite against a local ClickHouse server with:

```sh
CLICKHOUSE_NATIVE_INTEGRATION=true \
  pnpm --filter @effect/sql-clickhouse-native exec vitest run test/ClickHouseNativeClient.integration.test.ts
```

## Upstream references

- [Packet numbers in ClickHouse `Protocol.h`](https://github.com/ClickHouse/ClickHouse/blob/master/src/Core/Protocol.h)
- [Protocol revision feature definitions](https://github.com/ClickHouse/ClickHouse/blob/master/src/Core/ProtocolDefines.h)
- [ClickHouse Native protocol specification](https://github.com/ClickHouse/ClickHouse/blob/master/docs/reference/interfaces/specs/NativeProtocol.mdx)
