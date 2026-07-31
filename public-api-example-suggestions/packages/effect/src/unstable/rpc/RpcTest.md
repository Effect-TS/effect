# Example Suggestions: `effect/unstable/rpc/RpcTest`

- **Package:** `effect`
- **Source:** `packages/effect/src/unstable/rpc/RpcTest.ts`
- **Uncovered API records:** 1
- **Priorities:** 0 required, 1 recommended, 0 optional, 0 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                      | Line | Kind               | Priority        |
| ---------------------------------------- | ---: | ------------------ | --------------- |
| `effect/unstable/rpc/RpcTest.makeClient` |   26 | `root-declaration` | **recommended** |

## Recommended

### `effect/unstable/rpc/RpcTest.makeClient`

- **Source:** `packages/effect/src/unstable/rpc/RpcTest.ts:26`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **recommended**
- **Current description:** Creates an in-memory RPC client for a group, backed by the group's handlers from the environment and using the no-serialization test transport.
- **Signature hint:** `declare function makeClient<Rpcs extends Rpc.Any, const Flatten extends boolean = false>(group: RpcGroup.RpcGroup<Rpcs>, options?: { readonly flatten?: Flatten | undefined; }): Effect.Effect<Flatten extends true ? RpcClient.RpcClient.Flat<Rpcs> : RpcClient.RpcClient<Rpcs>, never, Scope.Scope | Rpc.ToHandler<Rpcs> | Rpc.Middleware<Rpcs> | Rpc.MiddlewareClient<Rpcs>>`
- **Import guidance:** Start from `import { RpcTest } from "effect/unstable/rpc"` and use `RpcTest.makeClient`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `RpcTest.makeClient`, execute it explicitly, and assert its semantic success value or captured failure.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.
