---
"effect": minor
"@effect/platform-node-shared": minor
"@effect/platform-node": minor
"@effect/platform-bun": minor
"@effect/platform-browser": minor
"@effect/platform-deno": minor
---

Add native MySQL, SQL Server, ClickHouse, and remote libSQL clients under `effect/mysql`, `effect/mssql`, `effect/clickhouse`, and `effect/libsql`, using portable socket, cryptography, and HTTP services without external database drivers while keeping existing SQL adapters available. Add RSA-OAEP encryption to Crypto and its Node, Bun, browser, and Deno providers, enabling MySQL SHA password authentication with pinned server keys or explicitly enabled key retrieval. Add optional socket TLS fragment configuration and handshake framing for SQL Server strict TDS 8 and mandatory TDS 7.4 encryption, preserving compatibility with existing custom Crypto services and socket writers.
