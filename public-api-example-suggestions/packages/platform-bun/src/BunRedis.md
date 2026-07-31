# Example Suggestions: `@effect/platform-bun/BunRedis`

- **Package:** `@effect/platform-bun`
- **Source:** `packages/platform-bun/src/BunRedis.ts`
- **Uncovered API records:** 3
- **Priorities:** 0 required, 3 recommended, 0 optional, 0 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                         | Line | Kind               | Priority        |
| ------------------------------------------- | ---: | ------------------ | --------------- |
| `@effect/platform-bun/BunRedis.layer`       |   71 | `root-declaration` | **recommended** |
| `@effect/platform-bun/BunRedis.layerConfig` |   81 | `root-declaration` | **recommended** |
| `@effect/platform-bun/BunRedis.BunRedis`    |   27 | `root-declaration` | **recommended** |

## Recommended

### `@effect/platform-bun/BunRedis.layer`

- **Source:** `packages/platform-bun/src/BunRedis.ts:71`
- **Kind / category:** `root-declaration` / `layers`
- **Priority:** **recommended**
- **Current description:** Creates scoped Bun Redis layers for `Redis.Redis` and `BunRedis`, closing the underlying client when the scope finalizes.
- **Signature hint:** `declare function layer(options?: ({ readonly url?: string; } & RedisOptions) | undefined): Layer.Layer<Redis.Redis | BunRedis>`
- **Import guidance:** Start from `import { BunRedis } from "@effect/platform-bun"` and use `BunRedis.layer`.
- **Suggested snippet:** Build the smallest Effect that consumes the service provided by `BunRedis.layer`, provide the layer, run the Effect, and assert the service result. If the production layer performs external I/O, use only a package-supported in-memory test implementation or leave it example-free.
- **Optional contrast:** Record acquisition and release events and assert cleanup after the scope closes.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `@effect/platform-bun/BunRedis.layerConfig`

- **Source:** `packages/platform-bun/src/BunRedis.ts:81`
- **Kind / category:** `root-declaration` / `layers`
- **Priority:** **recommended**
- **Current description:** Creates scoped Bun Redis layers from configurable Redis options, closing the underlying client when the scope finalizes.
- **Signature hint:** `declare function layerConfig(options: Config.Wrap<{ readonly url?: string; } & RedisOptions>): Layer.Layer<Redis.Redis | BunRedis, Config.ConfigError>`
- **Import guidance:** Start from `import { BunRedis } from "@effect/platform-bun"` and use `BunRedis.layerConfig`.
- **Suggested snippet:** Build the smallest Effect that consumes the service provided by `BunRedis.layerConfig`, provide the layer, run the Effect, and assert the service result. If the production layer performs external I/O, use only a package-supported in-memory test implementation or leave it example-free.
- **Optional contrast:** Record acquisition and release events and assert cleanup after the scope closes.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `@effect/platform-bun/BunRedis.BunRedis`

- **Source:** `packages/platform-bun/src/BunRedis.ts:27`
- **Kind / category:** `root-declaration` / `services`
- **Priority:** **recommended**
- **Current description:** Service tag for Bun Redis integration, exposing the raw `RedisClient` and a `use` helper that maps client promise failures to `RedisError`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { BunRedis } from "@effect/platform-bun"` and use `BunRedis.BunRedis`.
- **Suggested snippet:** Consume `BunRedis.BunRedis` from a small Effect, provide a deterministic test implementation or package-supported layer, run the program, and assert the service result without contacting external systems.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.
