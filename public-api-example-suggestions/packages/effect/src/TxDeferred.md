# Example Suggestions: `effect/TxDeferred`

- **Package:** `effect`
- **Source:** `packages/effect/src/TxDeferred.ts`
- **Uncovered API records:** 1
- **Priorities:** 0 required, 1 recommended, 0 optional, 0 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                       | Line | Kind               | Priority        |
| ------------------------- | ---: | ------------------ | --------------- |
| `effect/TxDeferred.await` |  162 | `root-declaration` | **recommended** |

## Recommended

### `effect/TxDeferred.await`

- **Source:** `packages/effect/src/TxDeferred.ts:162`
- **Kind / category:** `root-declaration` / `getters`
- **Priority:** **recommended**
- **Current description:** Reads the deferred value. Retries the transaction if the deferred has not been completed yet.
- **Signature hint:** `declare function await<A, E>(self: TxDeferred<A, E>): Effect.Effect<A, E>`
- **Import guidance:** Start from `import { TxDeferred } from "effect"` and use `TxDeferred.await`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `TxDeferred.await`, execute it explicitly, and assert its semantic success value or captured failure.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.
