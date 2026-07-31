# Example Suggestions: `effect/unstable/cluster/ClusterWorkflowEngine`

- **Package:** `effect`
- **Source:** `packages/effect/src/unstable/cluster/ClusterWorkflowEngine.ts`
- **Uncovered API records:** 2
- **Priorities:** 0 required, 1 recommended, 1 optional, 0 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                                   | Line | Kind               | Priority        |
| ----------------------------------------------------- | ---: | ------------------ | --------------- |
| `effect/unstable/cluster/ClusterWorkflowEngine.layer` |  778 | `root-declaration` | **recommended** |
| `effect/unstable/cluster/ClusterWorkflowEngine.make`  |   58 | `root-declaration` | **optional**    |

## Recommended

### `effect/unstable/cluster/ClusterWorkflowEngine.layer`

- **Source:** `packages/effect/src/unstable/cluster/ClusterWorkflowEngine.ts:778`
- **Kind / category:** `root-declaration` / `layers`
- **Priority:** **recommended**
- **Current description:** Layer that provides `WorkflowEngine.WorkflowEngine` using the cluster workflow engine implementation.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { ClusterWorkflowEngine } from "effect/unstable/cluster"` and use `ClusterWorkflowEngine.layer`.
- **Suggested snippet:** Build the smallest Effect that consumes the service provided by `ClusterWorkflowEngine.layer`, provide the layer, run the Effect, and assert the service result. If the production layer performs external I/O, use only a package-supported in-memory test implementation or leave it example-free.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

## Optional

### `effect/unstable/cluster/ClusterWorkflowEngine.make`

- **Source:** `packages/effect/src/unstable/cluster/ClusterWorkflowEngine.ts:58`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **optional**
- **Current description:** Creates a `WorkflowEngine` implementation backed by cluster sharding and message storage.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { ClusterWorkflowEngine } from "effect/unstable/cluster"` and use `ClusterWorkflowEngine.make`.
- **Suggested snippet:** Construct one representative value with `ClusterWorkflowEngine.make`, then pass it to the smallest canonical getter, matcher, or runner that exposes what was created. Do not merely assert an object kind.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.
