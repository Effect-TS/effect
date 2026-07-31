# Example Suggestions: `@effect/platform-node/NodeRedis`

- **Package:** `@effect/platform-node`
- **Source:** `packages/platform-node/src/NodeRedis.ts`
- **Uncovered API records:** 3
- **Priorities:** 0 required, 3 recommended, 0 optional, 0 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                           | Line | Kind               | Priority        |
| --------------------------------------------- | ---: | ------------------ | --------------- |
| `@effect/platform-node/NodeRedis.layer`       |   72 | `root-declaration` | **recommended** |
| `@effect/platform-node/NodeRedis.layerConfig` |   83 | `root-declaration` | **recommended** |
| `@effect/platform-node/NodeRedis.NodeRedis`   |   29 | `root-declaration` | **recommended** |

## Recommended

### `@effect/platform-node/NodeRedis.layer`

- **Source:** `packages/platform-node/src/NodeRedis.ts:72`
- **Kind / category:** `root-declaration` / `layers`
- **Priority:** **recommended**
- **Current description:** Provides `Redis` and `NodeRedis` services backed by an `ioredis` client created with the supplied options and closed when the layer scope ends.
- **Signature hint:** `declare function layer(options?: IoRedis.RedisOptions | undefined): Layer.Layer<Redis.Redis | NodeRedis>`
- **Import guidance:** Start from `import { NodeRedis } from "@effect/platform-node"` and use `NodeRedis.layer`.
- **Suggested snippet:** Build the smallest Effect that consumes the service provided by `NodeRedis.layer`, provide the layer, run the Effect, and assert the service result. If the production layer performs external I/O, use only a package-supported in-memory test implementation or leave it example-free.
- **Optional contrast:** Record acquisition and release events and assert cleanup after the scope closes.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `@effect/platform-node/NodeRedis.layerConfig`

- **Source:** `packages/platform-node/src/NodeRedis.ts:83`
- **Kind / category:** `root-declaration` / `layers`
- **Priority:** **recommended**
- **Current description:** Provides `Redis` and `NodeRedis` services from `Config`-backed ioredis options, closing the client when the layer scope ends.
- **Signature hint:** `declare function layerConfig(options: Config.Wrap<IoRedis.RedisOptions>): Layer.Layer<Redis.Redis | NodeRedis, Config.ConfigError>`
- **Import guidance:** Start from `import { NodeRedis } from "@effect/platform-node"` and use `NodeRedis.layerConfig`.
- **Suggested snippet:** Build the smallest Effect that consumes the service provided by `NodeRedis.layerConfig`, provide the layer, run the Effect, and assert the service result. If the production layer performs external I/O, use only a package-supported in-memory test implementation or leave it example-free.
- **Optional contrast:** Record acquisition and release events and assert cleanup after the scope closes.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `@effect/platform-node/NodeRedis.NodeRedis`

- **Source:** `packages/platform-node/src/NodeRedis.ts:29`
- **Kind / category:** `root-declaration` / `services`
- **Priority:** **recommended**
- **Current description:** Service tag for the Node Redis integration, exposing the underlying `ioredis` client and a `use` helper that maps client failures to `RedisError`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { NodeRedis } from "@effect/platform-node"` and use `NodeRedis.NodeRedis`.
- **Suggested snippet:** Consume `NodeRedis.NodeRedis` from a small Effect, provide a deterministic test implementation or package-supported layer, run the program, and assert the service result without contacting external systems.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.
