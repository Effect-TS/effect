# Example Suggestions: `effect/unstable/cluster/ClusterMetrics`

- **Package:** `effect`
- **Source:** `packages/effect/src/unstable/cluster/ClusterMetrics.ts`
- **Uncovered API records:** 5
- **Priorities:** 0 required, 0 recommended, 5 optional, 0 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                                     | Line | Kind               | Priority     |
| ------------------------------------------------------- | ---: | ------------------ | ------------ |
| `effect/unstable/cluster/ClusterMetrics.entities`       |   39 | `root-declaration` | **optional** |
| `effect/unstable/cluster/ClusterMetrics.singletons`     |   48 | `root-declaration` | **optional** |
| `effect/unstable/cluster/ClusterMetrics.runners`        |   66 | `root-declaration` | **optional** |
| `effect/unstable/cluster/ClusterMetrics.runnersHealthy` |   89 | `root-declaration` | **optional** |
| `effect/unstable/cluster/ClusterMetrics.shards`         |  112 | `root-declaration` | **optional** |

## Optional

### `effect/unstable/cluster/ClusterMetrics.entities`

- **Source:** `packages/effect/src/unstable/cluster/ClusterMetrics.ts:39`
- **Kind / category:** `root-declaration` / `metrics`
- **Priority:** **optional**
- **Current description:** Creates a gauge tracking the number of active entity instances for each entity type on the current runner.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { ClusterMetrics } from "effect/unstable/cluster"` and use `ClusterMetrics.entities`.
- **Suggested snippet:** Use `ClusterMetrics.entities` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cluster/ClusterMetrics.singletons`

- **Source:** `packages/effect/src/unstable/cluster/ClusterMetrics.ts:48`
- **Kind / category:** `root-declaration` / `metrics`
- **Priority:** **optional**
- **Current description:** Creates a gauge tracking the number of singleton processes currently running on the current runner.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { ClusterMetrics } from "effect/unstable/cluster"` and use `ClusterMetrics.singletons`.
- **Suggested snippet:** Use `ClusterMetrics.singletons` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cluster/ClusterMetrics.runners`

- **Source:** `packages/effect/src/unstable/cluster/ClusterMetrics.ts:66`
- **Kind / category:** `root-declaration` / `metrics`
- **Priority:** **optional**
- **Current description:** Represents a gauge tracking the number of registered cluster runners.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { ClusterMetrics } from "effect/unstable/cluster"` and use `ClusterMetrics.runners`.
- **Suggested snippet:** Use `ClusterMetrics.runners` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cluster/ClusterMetrics.runnersHealthy`

- **Source:** `packages/effect/src/unstable/cluster/ClusterMetrics.ts:89`
- **Kind / category:** `root-declaration` / `metrics`
- **Priority:** **optional**
- **Current description:** Represents a gauge tracking the number of cluster runners currently considered healthy.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { ClusterMetrics } from "effect/unstable/cluster"` and use `ClusterMetrics.runnersHealthy`.
- **Suggested snippet:** Use `ClusterMetrics.runnersHealthy` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cluster/ClusterMetrics.shards`

- **Source:** `packages/effect/src/unstable/cluster/ClusterMetrics.ts:112`
- **Kind / category:** `root-declaration` / `metrics`
- **Priority:** **optional**
- **Current description:** Represents a gauge tracking the number of shards currently acquired by the current runner.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { ClusterMetrics } from "effect/unstable/cluster"` and use `ClusterMetrics.shards`.
- **Suggested snippet:** Use `ClusterMetrics.shards` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Optional contrast:** Record acquisition and release events and assert cleanup after the scope closes.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.
