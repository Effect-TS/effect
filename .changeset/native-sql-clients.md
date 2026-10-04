---
"effect": minor
"@effect/platform-node-shared": minor
"@effect/platform-node": minor
"@effect/platform-bun": minor
"@effect/platform-browser": minor
"@effect/platform-deno": minor
---

Add native MySQL, SQL Server, ClickHouse, and remote libSQL clients under `effect/mysql`, `effect/mssql`, `effect/clickhouse`, and `effect/libsql`, using portable socket, cryptography, and HTTP services without external database drivers. Add RSA-OAEP encryption to Crypto and its Node, Bun, browser, and Deno providers, enabling MySQL SHA password authentication with pinned server keys or explicitly enabled key retrieval. Existing SQL adapter packages and custom Crypto services remain compatible.
