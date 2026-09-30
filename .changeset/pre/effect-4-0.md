---
"effect": patch
"@effect/ai-anthropic": patch
"@effect/ai-openai": patch
"@effect/ai-typesafe": patch
"@effect/ai-openai-compat": patch
"@effect/ai-openrouter": patch
"@effect/atom-react": patch
"@effect/atom-solid": patch
"@effect/atom-vue": patch
"@effect/docgen": patch
"@effect/doctest": patch
"@effect/openapi-generator": patch
"@effect/opentelemetry": patch
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
"@effect/vitest": patch
---

Effect 4.0 is the first stable release of Effect v4. It replaces the 4.0.0 beta and release-candidate series, whose per-release notes remain below under the `4.0.0-beta.*` and `4.0.0-rc.*` headings. To upgrade from Effect 3, follow the [migration guide](https://github.com/Effect-TS/effect/blob/main/MIGRATION.md).

**Packaging and versioning**

- All Effect packages share one version number and are released together. Use the same version of `effect` and every `@effect/*` package.
- `@effect/platform`, `@effect/rpc`, `@effect/cluster`, `@effect/cli`, `@effect/ai`, `@effect/sql`, `@effect/workflow`, `@effect/experimental` and similar packages are merged into `effect`. Separate packages remain only for platforms (`@effect/platform-*`), SQL drivers (`@effect/sql-*`), AI providers (`@effect/ai-*`), framework bindings (`@effect/atom-*`), OpenTelemetry, Vitest and tooling.
- Modules such as `effect/http`, `effect/http-api`, `effect/rpc`, `effect/cluster`, `effect/workflow`, `effect/ai`, `effect/cli`, `effect/sql` and `effect/schema` import from `effect/<area>`. APIs tagged `@stability unstable` may have breaking changes in minor releases. APIs without a stability tag follow semver.
- APIs that expose a third-party dependency are tagged `@stability unstable`, because that dependency's releases can change them. This covers `NodeRedis`, `DenoRedis`, `BunRedis`, `@effect/platform-node/Undici` and the undici dispatcher APIs, the `ws` options and re-exports in the platform packages, driver-specific options and clients in `@effect/sql-clickhouse`, `@effect/sql-d1`, `@effect/sql-libsql`, `@effect/sql-mssql`, `@effect/sql-mysql2`, `@effect/sql-pglite` and `@effect/sql-sqlite-do`, the provider clients, models and generated schemas in the `@effect/ai-*` packages, `@effect/opentelemetry`, and the `vitest` re-export in `@effect/vitest`.
- `effect` has no runtime dependencies.
- New packages in v4: `@effect/platform-deno`, `@effect/sql-pglite`, `@effect/ai-openai-compat`, `@effect/ai-typesafe`, `@effect/atom-react`, `@effect/atom-solid`, `@effect/atom-vue`, `@effect/openapi-generator` and `@effect/doctest`. `@effect/docgen` now lives in this repository.

**Core**

- The fiber runtime was rewritten for lower memory use and faster execution, with smaller bundles and better tree-shaking.
- Services are defined with `Context.Service`, `FiberRef` is replaced by `Context.Reference`, `Cause` has a flat structure, and many combinators were renamed. See the migration guide for the full list.
- Software transactional memory is built into `Effect.tx`, with `TxRef`, `TxQueue`, `TxHashMap`, `TxPubSub`, `TxSemaphore` and related `Tx*` data types.
- `Clock` separates wall-clock time from monotonic time.
- New modules include `Semaphore`, `Latch`, `LayerRef`, `ErrorReporter`, `ByteSize`, `Newtype` and `Crypto`. `Arbitrary` is now a native property-based testing module and no longer depends on fast-check.

**Schema**

- Schema v4 is a new implementation with faster parsing, class-based schemas, `make` constructors on every schema, and effectful decoding with services.
- `SchemaRepresentation` powers JSON Schema (Draft-04, Draft-07, 2020-12 and OpenAPI 3.0/3.1) import and export, TypeScript code generation, and AI structured output.
- `SchemaBinary` provides a compact binary codec and is the default wire format for cluster transports.
- Optional JIT and AOT schema compilers are available as experimental modules.

**Platform, HTTP and RPC**

- `HttpApi` supports typed response headers, streaming and SSE responses, the HTTP `QUERY` method, `HttpApiTest` for in-memory testing, and much faster type checking for large APIs.
- The HTTP modules add static file serving, response compression, rate-limited clients and graceful server shutdown.
- `Socket` has a pull-based reader with backpressure and STARTTLS support. Network addresses are modeled by `effect/net`.
- RPC serialization is schema-aware and supports server-originated requests and notifications.
- `@effect/platform-deno` adds full Deno support. The Node, Bun, Deno and browser packages all provide the platform `Crypto` service, and the browser package adds IndexedDB support.

**Cluster and Workflow**

- Workflows can be declared with class syntax, and `DurableQueue` and an in-memory `WorkflowEngine` are available.
- Runner memory can be bounded with `ShardingConfig` limits. Shutdown, entity movement and persisted replies are more reliable.

**SQL**

- `@effect/sql-pg` uses a built-in PostgreSQL client with pipelining, prepared statements and binary codecs, and no longer depends on `pg`.
- `@effect/sql-sqlite-node` uses Node's built-in `node:sqlite` and requires Node 22.16 or newer.
- `SqlError` exposes structured reasons such as `UniqueViolation`.

**AI**

- `effect/ai` adds `EmbeddingModel`, the `DecisionModel` classification and rating API, dynamic tools and tool approvals.
- The MCP server supports protocol versions 2024-11-05 through 2026-07-28, including elicitation, sampling with tools, resource subscriptions and typed tool output.
- Provider packages cover Anthropic, OpenAI, OpenAI-compatible APIs and OpenRouter.

**CLI, Atom, observability and testing**

- `effect/cli` adds global flags, command aliases and examples, an interactive wizard mode, and shell completions for Bash, Zsh and Fish.
- `effect/reactivity` and the `@effect/atom-*` bindings add SSR hydration, stale-while-revalidate atoms and serializable RPC and HttpApi queries.
- The OTLP exporters can be configured with standard OpenTelemetry environment variables, and `@effect/opentelemetry` aligns logs and spans with the OpenTelemetry specification.
- `@effect/vitest` runs property tests with the native `Arbitrary` module and supports Vitest fixtures.

**Requirements**

- TypeScript 5.9 or newer. TypeScript 7 is recommended.
- `@effect/vitest` and `@effect/doctest` require Vitest 5.
- `@effect/atom-react` requires React 19.
- `@effect/platform-deno` requires Deno 2.8.3 or newer.
