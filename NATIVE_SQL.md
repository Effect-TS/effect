# Native SQL clients

This project builds on [#8638](https://github.com/Effect-TS/effect/pull/8638)
and its portable PostgreSQL, Redis, socket, and cryptography services.

Here, native means that Effect implements the database protocol in TypeScript
without an external database driver. The clients live in Effect core and use
portable socket, cryptography, and HTTP services. They import no Node, Bun,
database SDK, or embedded engine modules. SQLite and PGlite are deferred.

| Existing client                                                | Native implementation                                               |
| -------------------------------------------------------------- | ------------------------------------------------------------------- |
| PostgreSQL                                                     | `effect/postgres`, provided by #8638                                |
| MySQL                                                          | MySQL wire protocol over `SocketConnector` and `Crypto`             |
| SQL Server                                                     | TDS over `SocketConnector`                                          |
| ClickHouse                                                     | HTTP protocol over `HttpClient`                                     |
| libSQL                                                         | Hrana protocol over `HttpClient`; local databases require an engine |
| SQLite (Node, Bun, D1, Durable Objects, browser, React Native) | Deferred to a separate project                                      |
| PGlite                                                         | Deferred to a separate project                                      |

The existing adapter packages remain available. The new entry points are
`effect/mysql`, `effect/mssql`, `effect/clickhouse`, and `effect/libsql`.

Each client's README describes its configuration and supported features:

- [MySQL](packages/effect/src/mysql/README.md)
- [SQL Server](packages/effect/src/mssql/README.md)
- [ClickHouse](packages/effect/src/clickhouse/README.md)
- [Remote libSQL](packages/effect/src/libsql/README.md)

MySQL supports native-password and SHA authentication over TLS or RSA-OAEP
password exchange. RSA uses a pinned server key by default; retrieving a key
requires explicit opt-in. The portable Crypto service provides RSA-OAEP through
Node, Bun, Deno, and browser implementations. SQL Server supports SQL authentication with strict TDS 8 TLS;
legacy TDS-wrapped TLS and Windows/FedAuth authentication are not implemented.
ClickHouse transactions fail explicitly, and its migration runner requires one
runner at a time. libSQL supports remote Hrana HTTP sessions; local files,
replication, and WebSocket transport remain in the existing adapter package.

Focused tests cover protocol framing, query binding, transactions, streaming,
resource cleanup, interruption, and SQL error classification. Scripted-peer
validation is separate from live database validation. Each client has an opt-in
integration suite that requires an explicitly configured disposable server.

Enable live tests with `EFFECT_INTEGRATION_TESTS=1` and set the corresponding
connection variables:

| Client     | Required connection variables                                                                                                           | Integration test                                                       |
| ---------- | --------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| MySQL      | `MYSQL_TEST_URL`, plus `MYSQL_TEST_TLS=1`, `MYSQL_TEST_PUBLIC_KEY`, or `MYSQL_TEST_ALLOW_PUBLIC_KEY_RETRIEVAL=1` for SHA authentication | `packages/effect/test/mysql/MysqlConnection.integration.test.ts`       |
| SQL Server | `MSSQL_TEST_HOST`, `MSSQL_TEST_USERNAME`, `MSSQL_TEST_PASSWORD`; optional private CA and database settings                              | `packages/effect/test/mssql/MssqlClient.integration.test.ts`           |
| ClickHouse | `CLICKHOUSE_TEST_URL`; optional username, password, and database settings                                                               | `packages/effect/test/clickhouse/ClickhouseClient.integration.test.ts` |
| libSQL     | `LIBSQL_TEST_URL`; optional `LIBSQL_TEST_AUTH_TOKEN`                                                                                    | `packages/effect/test/libsql/LibsqlClient.integration.test.ts`         |

Each test file documents its remaining options. Run the selected suite from
the repository root with `pnpm test --run <integration-test-file>`.
