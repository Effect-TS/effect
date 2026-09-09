---
"@effect/ai-anthropic": patch
"@effect/ai-openai": patch
"@effect/ai-openai-compat": patch
"@effect/ai-openrouter": patch
"@effect/atom-react": patch
"@effect/atom-solid": patch
"@effect/atom-vue": patch
"@effect/openapi-generator": patch
"@effect/platform-browser": patch
"@effect/platform-bun": patch
"@effect/platform-deno": patch
"@effect/platform-node": patch
"@effect/platform-node-shared": patch
"@effect/sql-clickhouse": patch
"@effect/sql-d1": patch
"@effect/sql-libsql": patch
"@effect/sql-mssql": patch
"@effect/sql-mysql2": patch
"@effect/sql-pg": patch
"@effect/sql-pglite": patch
"@effect/sql-sqlite-bun": patch
"@effect/sql-sqlite-do": patch
"@effect/sql-sqlite-node": patch
"@effect/sql-sqlite-react-native": patch
"@effect/sql-sqlite-wasm": patch
"effect": patch
---

Use class syntax for Context.Service declarations throughout the core, unstable modules, platform services, SQL drivers, and examples. Service keys and runtime behavior are preserved, and the direct const form of Context.Service remains supported.

This is a breaking type cleanup for the Effect 4 release candidate. Service class types now identify environment requirements; use `ServiceClass["Service"]` (or the accompanying `Service` namespace member) to annotate implementation values. Update interface inheritance to extend the service shape rather than the identifier.
