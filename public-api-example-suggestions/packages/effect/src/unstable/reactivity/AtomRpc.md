# Example Suggestions: `effect/unstable/reactivity/AtomRpc`

- **Package:** `effect`
- **Source:** `packages/effect/src/unstable/reactivity/AtomRpc.ts`
- **Uncovered API records:** 2
- **Priorities:** 0 required, 1 recommended, 1 optional, 0 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                                | Line | Kind               | Priority        |
| -------------------------------------------------- | ---: | ------------------ | --------------- |
| `effect/unstable/reactivity/AtomRpc.Service`       |  131 | `root-declaration` | **recommended** |
| `effect/unstable/reactivity/AtomRpc.AtomRpcClient` |   43 | `root-declaration` | **optional**    |

## Recommended

### `effect/unstable/reactivity/AtomRpc.Service`

- **Source:** `packages/effect/src/unstable/reactivity/AtomRpc.ts:131`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **recommended**
- **Current description:** Creates a `Context.Service` class for an RPC client backed by an atom runtime.
- **Signature hint:** `declare function Service<Self>(): <const Id extends string, Rpcs extends Rpc.Any, ER, RM = RpcClient.Protocol | Rpc.MiddlewareClient<NoInfer<Rpcs>> | Rpc.ServicesClient<NoInfer<Rpcs>>>(id: Id, options: { readonly group: RpcGroup.RpcGroup<Rpcs>; readonly protocol: Layer.Layer<Exclude<NoInfer<RM>, Scope>, ER> | ((get: Atom.AtomContext) => Layer.Layer<Exclude<NoInfer<RM>, Scope>, ER>); readonly spanPrefix?: string | undefined; readonly spanAttributes?: Record<string, unknown> | undefined; readonly generateRequestId?: (() => RequestId) | undefined; readonly disableTracing?: boolean | undefined; readonly makeEffect?: Effect.Effect<RpcClient.RpcClient.Flat<Rpcs, RpcClientError>, never, RM> | undefined; readonly runtime?: Atom.RuntimeFactory | undefined; }) => AtomRpcClient<Self, Id, Rpcs>`
- **Import guidance:** Start from `import { AtomRpc } from "effect/unstable/reactivity"` and use `AtomRpc.Service`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Creates a `Context.Service` class for an RPC client backed by an atom runtime. Call `AtomRpc.Service` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

## Optional

### `effect/unstable/reactivity/AtomRpc.AtomRpcClient`

- **Source:** `packages/effect/src/unstable/reactivity/AtomRpc.ts:43`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** A `Context.Service` for a flattened RPC client integrated with atom reactivity.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/reactivity/AtomRpc.AtomRpcClient`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.
