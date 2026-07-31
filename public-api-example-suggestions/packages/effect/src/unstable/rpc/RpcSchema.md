# Example Suggestions: `effect/unstable/rpc/RpcSchema`

- **Package:** `effect`
- **Source:** `packages/effect/src/unstable/rpc/RpcSchema.ts`
- **Uncovered API records:** 4
- **Priorities:** 0 required, 2 recommended, 2 optional, 0 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                            | Line | Kind               | Priority        |
| ---------------------------------------------- | ---: | ------------------ | --------------- |
| `effect/unstable/rpc/RpcSchema.isStreamSchema` |   29 | `root-declaration` | **recommended** |
| `effect/unstable/rpc/RpcSchema.Stream (value)` |   81 | `root-declaration` | **recommended** |
| `effect/unstable/rpc/RpcSchema.Stream (type)`  |   53 | `root-declaration` | **optional**    |
| `effect/unstable/rpc/RpcSchema.ClientAbort`    |   92 | `root-declaration` | **optional**    |

## Recommended

### `effect/unstable/rpc/RpcSchema.isStreamSchema`

- **Source:** `packages/effect/src/unstable/rpc/RpcSchema.ts:29`
- **Kind / category:** `root-declaration` / `streams`
- **Priority:** **recommended**
- **Current description:** Returns `true` when a schema is an RPC stream schema created by `RpcSchema.Stream`.
- **Signature hint:** `declare function isStreamSchema(schema: Schema.Constraint): schema is Stream<Schema.Top, Schema.Top>`
- **Import guidance:** Start from `import { RpcSchema } from "effect/unstable/rpc"` and use `RpcSchema.isStreamSchema`.
- **Suggested snippet:** Create one matching public value and one non-matching value accepted by the parameter type, call `RpcSchema.isStreamSchema` for both, and access a narrowed property in the true branch to demonstrate the type predicate.
- **Optional contrast:** Use one matching and one non-matching value from the accepted input domain.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/rpc/RpcSchema.Stream (value)`

- **Source:** `packages/effect/src/unstable/rpc/RpcSchema.ts:81`
- **Kind / category:** `root-declaration` / `streams`
- **Priority:** **recommended**
- **Current description:** Creates an RPC stream schema from a stream element success schema and stream error schema.
- **Signature hint:** `declare function Stream<A extends Schema.Constraint, E extends Schema.Constraint>(success: A, error: E): Stream<A, E>`
- **Import guidance:** Start from `import { RpcSchema } from "effect/unstable/rpc"` and use `RpcSchema.Stream`.
- **Suggested snippet:** Define the smallest domain Schema involving `RpcSchema.Stream`, decode one representative unknown input, and assert the typed semantic output. If encoded and decoded forms differ, also encode once to show the reverse boundary.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

## Optional

### `effect/unstable/rpc/RpcSchema.Stream (type)`

- **Source:** `packages/effect/src/unstable/rpc/RpcSchema.ts:53`
- **Kind / category:** `root-declaration` / `streams`
- **Priority:** **optional**
- **Current description:** A schema marker for RPC streaming responses, storing the success element schema and stream error schema used for encoding and decoding stream chunks.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/rpc/RpcSchema.Stream`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/rpc/RpcSchema.ClientAbort`

- **Source:** `packages/effect/src/unstable/rpc/RpcSchema.ts:92`
- **Kind / category:** `root-declaration` / `Cause annotations`
- **Priority:** **optional**
- **Current description:** Annotation that marks interruptions that originate from an RPC client abort.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { RpcSchema } from "effect/unstable/rpc"` and use `RpcSchema.ClientAbort`.
- **Suggested snippet:** Consume `RpcSchema.ClientAbort` from a small Effect, provide a deterministic test implementation or package-supported layer, run the program, and assert the service result without contacting external systems.
- **Optional contrast:** Use `TestClock` or explicit synchronization rather than elapsed wall time.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.
