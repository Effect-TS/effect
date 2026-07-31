# Example Suggestions: `effect/unstable/cluster/RunnerHealth`

- **Package:** `effect`
- **Source:** `packages/effect/src/unstable/cluster/RunnerHealth.ts`
- **Uncovered API records:** 6
- **Priorities:** 0 required, 5 recommended, 1 optional, 0 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                                 | Line | Kind               | Priority        |
| --------------------------------------------------- | ---: | ------------------ | --------------- |
| `effect/unstable/cluster/RunnerHealth.layerNoop`    |   51 | `root-declaration` | **recommended** |
| `effect/unstable/cluster/RunnerHealth.layerPing`    |   88 | `root-declaration` | **recommended** |
| `effect/unstable/cluster/RunnerHealth.makeK8s`      |  105 | `root-declaration` | **recommended** |
| `effect/unstable/cluster/RunnerHealth.layerK8s`     |  136 | `root-declaration` | **recommended** |
| `effect/unstable/cluster/RunnerHealth.makePing`     |   63 | `root-declaration` | **recommended** |
| `effect/unstable/cluster/RunnerHealth.RunnerHealth` |   33 | `root-declaration` | **optional**    |

## Recommended

### `effect/unstable/cluster/RunnerHealth.layerNoop`

- **Source:** `packages/effect/src/unstable/cluster/RunnerHealth.ts:51`
- **Kind / category:** `root-declaration` / `layers`
- **Priority:** **recommended**
- **Current description:** Layer that always considers a runner healthy.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { RunnerHealth } from "effect/unstable/cluster"` and use `RunnerHealth.layerNoop`.
- **Suggested snippet:** Use `RunnerHealth.layerNoop` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/cluster/RunnerHealth.layerPing`

- **Source:** `packages/effect/src/unstable/cluster/RunnerHealth.ts:88`
- **Kind / category:** `root-declaration` / `layers`
- **Priority:** **recommended**
- **Current description:** Layer that pings runners directly to check whether they are healthy.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { RunnerHealth } from "effect/unstable/cluster"` and use `RunnerHealth.layerPing`.
- **Suggested snippet:** Build the smallest Effect that consumes the service provided by `RunnerHealth.layerPing`, provide the layer, run the Effect, and assert the service result. If the production layer performs external I/O, use only a package-supported in-memory test implementation or leave it example-free.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/cluster/RunnerHealth.makeK8s`

- **Source:** `packages/effect/src/unstable/cluster/RunnerHealth.ts:105`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **recommended**
- **Current description:** Creates a `RunnerHealth` service that checks Kubernetes pod readiness for a runner host, optionally scoped by namespace and label selector.
- **Signature hint:** `declare function makeK8s(options?: { readonly namespace?: string | undefined; readonly labelSelector?: string | undefined; } | undefined): Effect.Effect<{ readonly isAlive: (address: RunnerAddress) => Effect.Effect<boolean>; }, never, K8s.K8sHttpClient>`
- **Import guidance:** Start from `import { RunnerHealth } from "effect/unstable/cluster"` and use `RunnerHealth.makeK8s`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `RunnerHealth.makeK8s`, execute it explicitly, and assert its semantic success value or captured failure.
- **Optional contrast:** Record acquisition and release events and assert cleanup after the scope closes.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/cluster/RunnerHealth.layerK8s`

- **Source:** `packages/effect/src/unstable/cluster/RunnerHealth.ts:136`
- **Kind / category:** `root-declaration` / `layers`
- **Priority:** **recommended**
- **Current description:** Layer that checks Kubernetes pod readiness to determine whether a runner is healthy.
- **Signature hint:** `declare function layerK8s(options?: { readonly namespace?: string | undefined; readonly labelSelector?: string | undefined; } | undefined): Layer.Layer<RunnerHealth, never, K8s.K8sHttpClient>`
- **Import guidance:** Start from `import { RunnerHealth } from "effect/unstable/cluster"` and use `RunnerHealth.layerK8s`.
- **Suggested snippet:** Build the smallest Effect that consumes the service provided by `RunnerHealth.layerK8s`, provide the layer, run the Effect, and assert the service result. If the production layer performs external I/O, use only a package-supported in-memory test implementation or leave it example-free.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/cluster/RunnerHealth.makePing`

- **Source:** `packages/effect/src/unstable/cluster/RunnerHealth.ts:63`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **recommended**
- **Current description:** Creates a `RunnerHealth` service that pings runners through `Runners`, retrying failed pings on a short schedule and treating a successful ping within the timeout as healthy.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { RunnerHealth } from "effect/unstable/cluster"` and use `RunnerHealth.makePing`.
- **Suggested snippet:** Construct one representative value with `RunnerHealth.makePing`, then pass it to the smallest canonical getter, matcher, or runner that exposes what was created. Do not merely assert an object kind.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

## Optional

### `effect/unstable/cluster/RunnerHealth.RunnerHealth`

- **Source:** `packages/effect/src/unstable/cluster/RunnerHealth.ts:33`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Represents the service used to check if a Runner is healthy.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { RunnerHealth } from "effect/unstable/cluster"` and use `RunnerHealth.RunnerHealth`.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `RunnerHealth.RunnerHealth`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.
