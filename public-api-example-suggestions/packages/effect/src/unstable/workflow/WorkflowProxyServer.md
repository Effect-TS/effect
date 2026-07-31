# Example Suggestions: `effect/unstable/workflow/WorkflowProxyServer`

- **Package:** `effect`
- **Source:** `packages/effect/src/unstable/workflow/WorkflowProxyServer.ts`
- **Uncovered API records:** 3
- **Priorities:** 0 required, 2 recommended, 1 optional, 0 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                                             | Line | Kind               | Priority        |
| --------------------------------------------------------------- | ---: | ------------------ | --------------- |
| `effect/unstable/workflow/WorkflowProxyServer.layerHttpApi`     |   30 | `root-declaration` | **recommended** |
| `effect/unstable/workflow/WorkflowProxyServer.layerRpcHandlers` |   96 | `root-declaration` | **recommended** |
| `effect/unstable/workflow/WorkflowProxyServer.RpcHandlers`      |  144 | `root-declaration` | **optional**    |

## Recommended

### `effect/unstable/workflow/WorkflowProxyServer.layerHttpApi`

- **Source:** `packages/effect/src/unstable/workflow/WorkflowProxyServer.ts:30`
- **Kind / category:** `root-declaration` / `layers`
- **Priority:** **recommended**
- **Current description:** Creates handlers for a workflow HTTP API group, wiring execute, discard, and resume endpoints to the supplied workflows.
- **Signature hint:** `declare function layerHttpApi<ApiId extends string, Groups extends HttpApiGroup.Constraint, Identifier extends HttpApiGroup.Identifier<Groups>, const Workflows extends NonEmptyReadonlyArray<Workflow.Any>>(api: HttpApi.HttpApi<ApiId, Groups>, identifier: Identifier, workflows: Workflows): Layer.Layer<HttpApiGroup.Service<ApiId, Identifier>, never, WorkflowEngine | Workflow.RequirementsHandler<Workflows[number]>>`
- **Import guidance:** Start from `import { WorkflowProxyServer } from "effect/unstable/workflow"` and use `WorkflowProxyServer.layerHttpApi`.
- **Suggested snippet:** Build the smallest Effect that consumes the service provided by `WorkflowProxyServer.layerHttpApi`, provide the layer, run the Effect, and assert the service result. If the production layer performs external I/O, use only a package-supported in-memory test implementation or leave it example-free.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/workflow/WorkflowProxyServer.layerRpcHandlers`

- **Source:** `packages/effect/src/unstable/workflow/WorkflowProxyServer.ts:96`
- **Kind / category:** `root-declaration` / `layers`
- **Priority:** **recommended**
- **Current description:** Creates RPC handlers for the supplied workflows, wiring execute, discard, and resume RPCs to workflow operations.
- **Signature hint:** `declare function layerRpcHandlers<const Workflows extends NonEmptyReadonlyArray<Workflow.Any>, const Prefix extends string = ''>(workflows: Workflows, options?: { readonly prefix?: Prefix; }): Layer.Layer<RpcHandlers<Workflows[number], Prefix>, never, WorkflowEngine | Workflow.RequirementsHandler<Workflows[number]>>`
- **Import guidance:** Start from `import { WorkflowProxyServer } from "effect/unstable/workflow"` and use `WorkflowProxyServer.layerRpcHandlers`.
- **Suggested snippet:** Build the smallest Effect that consumes the service provided by `WorkflowProxyServer.layerRpcHandlers`, provide the layer, run the Effect, and assert the service result. If the production layer performs external I/O, use only a package-supported in-memory test implementation or leave it example-free.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

## Optional

### `effect/unstable/workflow/WorkflowProxyServer.RpcHandlers`

- **Source:** `packages/effect/src/unstable/workflow/WorkflowProxyServer.ts:144`
- **Kind / category:** `root-declaration` / `services`
- **Priority:** **optional**
- **Current description:** Union of RPC handler services required to serve the generated workflow execute, discard, and resume RPCs.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/workflow/WorkflowProxyServer.RpcHandlers`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.
