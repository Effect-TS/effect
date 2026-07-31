# Example Suggestions: `@effect/platform-deno/DenoRedis`

- **Package:** `@effect/platform-deno`
- **Source:** `packages/platform-deno/src/DenoRedis.ts`
- **Uncovered API records:** 4
- **Priorities:** 0 required, 3 recommended, 1 optional, 0 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                            | Line | Kind               | Priority        |
| ---------------------------------------------- | ---: | ------------------ | --------------- |
| `@effect/platform-deno/DenoRedis.layer`        |   95 | `root-declaration` | **recommended** |
| `@effect/platform-deno/DenoRedis.layerConfig`  |  106 | `root-declaration` | **recommended** |
| `@effect/platform-deno/DenoRedis.DenoRedis`    |   41 | `root-declaration` | **recommended** |
| `@effect/platform-deno/DenoRedis.RedisOptions` |   29 | `root-declaration` | **optional**    |

## Recommended

### `@effect/platform-deno/DenoRedis.layer`

- **Source:** `packages/platform-deno/src/DenoRedis.ts:95`
- **Kind / category:** `root-declaration` / `layers`
- **Priority:** **recommended**
- **Current description:** Provides `Redis` and `DenoRedis` services backed by an `@db/redis` client, closing the client when the layer scope ends. URL-derived options can be overridden by other supplied options.
- **Signature hint:** `declare function layer(options?: RedisOptions | undefined): Layer.Layer<Redis.Redis | DenoRedis, Redis.RedisError>`
- **Import guidance:** Start from `import { DenoRedis } from "@effect/platform-deno"` and use `DenoRedis.layer`.
- **Suggested snippet:** Build the smallest Effect that consumes the service provided by `DenoRedis.layer`, provide the layer, run the Effect, and assert the service result. If the production layer performs external I/O, use only a package-supported in-memory test implementation or leave it example-free.
- **Optional contrast:** Record acquisition and release events and assert cleanup after the scope closes.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `@effect/platform-deno/DenoRedis.layerConfig`

- **Source:** `packages/platform-deno/src/DenoRedis.ts:106`
- **Kind / category:** `root-declaration` / `layers`
- **Priority:** **recommended**
- **Current description:** Provides `Redis` and `DenoRedis` services from `Config`-backed options, closing the client when the layer scope ends.
- **Signature hint:** `declare function layerConfig(options: Config.Wrap<RedisOptions>): Layer.Layer<Redis.Redis | DenoRedis, Redis.RedisError | Config.ConfigError>`
- **Import guidance:** Start from `import { DenoRedis } from "@effect/platform-deno"` and use `DenoRedis.layerConfig`.
- **Suggested snippet:** Build the smallest Effect that consumes the service provided by `DenoRedis.layerConfig`, provide the layer, run the Effect, and assert the service result. If the production layer performs external I/O, use only a package-supported in-memory test implementation or leave it example-free.
- **Optional contrast:** Record acquisition and release events and assert cleanup after the scope closes.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `@effect/platform-deno/DenoRedis.DenoRedis`

- **Source:** `packages/platform-deno/src/DenoRedis.ts:41`
- **Kind / category:** `root-declaration` / `services`
- **Priority:** **recommended**
- **Current description:** Service tag for Deno Redis integration, exposing the raw `@db/redis` client and a `use` helper that maps client promise failures to `RedisError`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { DenoRedis } from "@effect/platform-deno"` and use `DenoRedis.DenoRedis`.
- **Suggested snippet:** Consume `DenoRedis.DenoRedis` from a small Effect, provide a deterministic test implementation or package-supported layer, run the program, and assert the service result without contacting external systems.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

## Optional

### `@effect/platform-deno/DenoRedis.RedisOptions`

- **Source:** `packages/platform-deno/src/DenoRedis.ts:29`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Options for connecting to Redis, including a Redis URL or individual connection settings. Explicit settings override values from the URL.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `@effect/platform-deno/DenoRedis.RedisOptions`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.
