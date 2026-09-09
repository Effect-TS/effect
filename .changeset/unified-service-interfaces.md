---
"@effect/ai-anthropic": patch
"@effect/ai-openai": patch
"@effect/ai-openai-compat": patch
"@effect/ai-openrouter": patch
"@effect/docgen": patch
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

Use same-name interfaces and `Context.Service` values for owned object services across Effect, platform adapters, AI providers, and tooling. Each migrated service has a TypeId, and its interface names both the implementation and context requirement.

Replace implementation annotations such as `Foo["Service"]` with `Foo`. Use module constructors where available; manually implemented services must include the interface's required TypeId. Migrated exports no longer have class constructor types. Define new service classes through `Context.Service` itself, which continues to support both class and const forms.

Primitive annotations and services that retain borrowed object identities keep their existing declarations. Service key strings are unchanged, and AI configuration TypeIds are omitted from provider request options.
