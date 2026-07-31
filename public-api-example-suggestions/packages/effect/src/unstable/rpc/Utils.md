# Example Suggestions: `effect/unstable/rpc/Utils`

- **Package:** `effect`
- **Source:** `packages/effect/src/unstable/rpc/Utils.ts`
- **Uncovered API records:** 2
- **Priorities:** 0 required, 2 recommended, 0 optional, 0 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                       | Line | Kind               | Priority        |
| ----------------------------------------- | ---: | ------------------ | --------------- |
| `effect/unstable/rpc/Utils.withRun`       |   25 | `root-declaration` | **recommended** |
| `effect/unstable/rpc/Utils.withRunClient` |   68 | `root-declaration` | **recommended** |

## Recommended

### `effect/unstable/rpc/Utils.withRun`

- **Source:** `packages/effect/src/unstable/rpc/Utils.ts:25`
- **Kind / category:** `root-declaration` / `services`
- **Priority:** **recommended**
- **Current description:** Builds a service with a `run` method that buffers writes until `run` installs a writer, replays buffered writes with their original contexts, and restores the previous writer when the run ends.
- **Signature hint:** `declare function withRun<A extends { readonly run: (f: (...args: Array<any>) => Effect.Effect<void>) => Effect.Effect<never>; }>(): <EX, RX>(f: (write: Parameters<A['run']>[0]) => Effect.Effect<Omit<A, 'run'>, EX, RX>) => Effect.Effect<A, EX, RX>`
- **Import guidance:** Start from `import { Utils } from "effect/unstable/rpc"` and use `Utils.withRun`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `Utils.withRun`, execute it explicitly, and assert its semantic success value or captured failure.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/rpc/Utils.withRunClient`

- **Source:** `packages/effect/src/unstable/rpc/Utils.ts:68`
- **Kind / category:** `root-declaration` / `services`
- **Priority:** **recommended**
- **Current description:** Builds an RPC client protocol service that tracks active client IDs and buffers server responses per client until that client's `run` handler is installed.
- **Signature hint:** `declare function withRunClient<EX, RX>(f: (write: (clientId: number, response: FromServerEncoded) => Effect.Effect<void>, clientIds: ReadonlySet<number>) => Effect.Effect<Omit<Protocol['Service'], 'run'>, EX, RX>): Effect.Effect<Protocol['Service'], EX, RX>`
- **Import guidance:** Start from `import { Utils } from "effect/unstable/rpc"` and use `Utils.withRunClient`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `Utils.withRunClient`, execute it explicitly, and assert its semantic success value or captured failure.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.
