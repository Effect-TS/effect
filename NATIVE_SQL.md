# Native SQL clients

This project builds on [#8638](https://github.com/Effect-TS/effect/pull/8638)
and its portable PostgreSQL, Redis, socket, and cryptography services.

Network clients live in Effect core and use platform services instead of
external database drivers. Embedded clients retain the database engine required
by their runtime and expose it through Effect services.

| Existing client | Native implementation |
| --- | --- |
| PostgreSQL | `effect/postgres`, provided by #8638 |
| MySQL | MySQL wire protocol over `SocketConnector` and `Crypto` |
| SQL Server | TDS over `SocketConnector` |
| ClickHouse | HTTP protocol over `HttpClient` |
| libSQL | Hrana protocol over `HttpClient`; local databases require an engine |
| Node SQLite | `node:sqlite` binding to the portable SQLite service |
| Bun SQLite | `bun:sqlite` binding to the portable SQLite service |
| D1 and Durable Objects | Runtime database bindings |
| Browser SQLite and React Native | Required WASM or native SQLite engine bindings |
| PGlite | Required embedded PostgreSQL engine binding |

The existing adapter packages remain available during implementation. This draft
does not claim feature parity until the corresponding implementation and focused
validation are complete. Protocol behavior, resource cleanup, parameter binding,
transactions, and error classification require focused coverage. Database-backed
and runtime-specific validation is reported separately from scripted fixtures.
