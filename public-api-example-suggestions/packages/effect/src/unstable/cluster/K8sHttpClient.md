# Example Suggestions: `effect/unstable/cluster/K8sHttpClient`

- **Package:** `effect`
- **Source:** `packages/effect/src/unstable/cluster/K8sHttpClient.ts`
- **Uncovered API records:** 6
- **Priorities:** 0 required, 5 recommended, 1 optional, 0 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                                   | Line | Kind               | Priority        |
| ----------------------------------------------------- | ---: | ------------------ | --------------- |
| `effect/unstable/cluster/K8sHttpClient.layer`         |   47 | `root-declaration` | **recommended** |
| `effect/unstable/cluster/K8sHttpClient.K8sHttpClient` |   30 | `root-declaration` | **recommended** |
| `effect/unstable/cluster/K8sHttpClient.makeGetPods`   |   80 | `root-declaration` | **recommended** |
| `effect/unstable/cluster/K8sHttpClient.PodStatus`     |  233 | `root-declaration` | **recommended** |
| `effect/unstable/cluster/K8sHttpClient.Pod`           |  254 | `root-declaration` | **recommended** |
| `effect/unstable/cluster/K8sHttpClient.makeCreatePod` |  129 | `root-declaration` | **optional**    |

## Recommended

### `effect/unstable/cluster/K8sHttpClient.layer`

- **Source:** `packages/effect/src/unstable/cluster/K8sHttpClient.ts:47`
- **Kind / category:** `root-declaration` / `layers`
- **Priority:** **recommended**
- **Current description:** Layer that configures `K8sHttpClient` for the in-cluster Kubernetes API.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { K8sHttpClient } from "effect/unstable/cluster"` and use `K8sHttpClient.layer`.
- **Suggested snippet:** Build the smallest Effect that consumes the service provided by `K8sHttpClient.layer`, provide the layer, run the Effect, and assert the service result. If the production layer performs external I/O, use only a package-supported in-memory test implementation or leave it example-free.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/cluster/K8sHttpClient.K8sHttpClient`

- **Source:** `packages/effect/src/unstable/cluster/K8sHttpClient.ts:30`
- **Kind / category:** `root-declaration` / `services`
- **Priority:** **recommended**
- **Current description:** Service tag for the HTTP client used to call the Kubernetes API.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { K8sHttpClient } from "effect/unstable/cluster"` and use `K8sHttpClient.K8sHttpClient`.
- **Suggested snippet:** Consume `K8sHttpClient.K8sHttpClient` from a small Effect, provide a deterministic test implementation or package-supported layer, run the program, and assert the service result without contacting external systems.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/cluster/K8sHttpClient.makeGetPods`

- **Source:** `packages/effect/src/unstable/cluster/K8sHttpClient.ts:80`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **recommended**
- **Current description:** Creates a cached effect that fetches running Kubernetes pods.
- **Signature hint:** `declare function makeGetPods(options?: { readonly namespace?: string | undefined; readonly labelSelector?: string | undefined; } | undefined): Effect.Effect<Effect.Effect<Map<string, Pod>, HttpClientError.HttpClientError | Schema.SchemaError, never>, never, K8sHttpClient>`
- **Import guidance:** Start from `import { K8sHttpClient } from "effect/unstable/cluster"` and use `K8sHttpClient.makeGetPods`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `K8sHttpClient.makeGetPods`, execute it explicitly, and assert its semantic success value or captured failure.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/cluster/K8sHttpClient.PodStatus`

- **Source:** `packages/effect/src/unstable/cluster/K8sHttpClient.ts:233`
- **Kind / category:** `root-declaration` / `schemas`
- **Priority:** **recommended**
- **Current description:** Schema for the subset of Kubernetes Pod status used by cluster helpers.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { K8sHttpClient } from "effect/unstable/cluster"` and use `K8sHttpClient.PodStatus`.
- **Suggested snippet:** Use `K8sHttpClient.PodStatus` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/cluster/K8sHttpClient.Pod`

- **Source:** `packages/effect/src/unstable/cluster/K8sHttpClient.ts:254`
- **Kind / category:** `root-declaration` / `schemas`
- **Priority:** **recommended**
- **Current description:** Schema for Kubernetes Pod values used by cluster helpers.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { K8sHttpClient } from "effect/unstable/cluster"` and use `K8sHttpClient.Pod`.
- **Suggested snippet:** Use `K8sHttpClient.Pod` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

## Optional

### `effect/unstable/cluster/K8sHttpClient.makeCreatePod`

- **Source:** `packages/effect/src/unstable/cluster/K8sHttpClient.ts:129`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **optional**
- **Current description:** Creates a scoped function that ensures a Kubernetes pod exists and waits until it is ready.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { K8sHttpClient } from "effect/unstable/cluster"` and use `K8sHttpClient.makeCreatePod`.
- **Suggested snippet:** Construct one representative value with `K8sHttpClient.makeCreatePod`, then pass it to the smallest canonical getter, matcher, or runner that exposes what was created. Do not merely assert an object kind.
- **Optional contrast:** Record acquisition and release events and assert cleanup after the scope closes.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.
