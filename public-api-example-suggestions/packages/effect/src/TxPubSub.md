# Example Suggestions: `effect/TxPubSub`

- **Package:** `effect`
- **Source:** `packages/effect/src/TxPubSub.ts`
- **Uncovered API records:** 2
- **Priorities:** 0 required, 2 recommended, 0 optional, 0 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                 | Line | Kind               | Priority        |
| ----------------------------------- | ---: | ------------------ | --------------- |
| `effect/TxPubSub.acquireSubscriber` |  546 | `root-declaration` | **recommended** |
| `effect/TxPubSub.releaseSubscriber` |  579 | `root-declaration` | **recommended** |

## Recommended

### `effect/TxPubSub.acquireSubscriber`

- **Source:** `packages/effect/src/TxPubSub.ts:546`
- **Kind / category:** `root-declaration` / `mutations`
- **Priority:** **recommended**
- **Current description:** Creates a subscriber queue and registers it with the pub/sub.
- **Signature hint:** `declare function acquireSubscriber<A>(self: TxPubSub<A>): Effect.Effect<TxQueue.TxQueue<A>, never, Effect.Transaction>`
- **Import guidance:** Start from `import { TxPubSub } from "effect"` and use `TxPubSub.acquireSubscriber`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `TxPubSub.acquireSubscriber`, execute it explicitly, and assert its semantic success value or captured failure.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/TxPubSub.releaseSubscriber`

- **Source:** `packages/effect/src/TxPubSub.ts:579`
- **Kind / category:** `root-declaration` / `mutations`
- **Priority:** **recommended**
- **Current description:** Removes a subscriber queue from the pub/sub and shuts it down.
- **Signature hint:** `declare function releaseSubscriber<A>(queue: TxQueue.TxQueue<A>): (self: TxPubSub<A>) => Effect.Effect<void, never, Effect.Transaction> declare function releaseSubscriber<A>(self: TxPubSub<A>, queue: TxQueue.TxQueue<A>): Effect.Effect<void, never, Effect.Transaction>`
- **Import guidance:** Start from `import { TxPubSub } from "effect"` and use `TxPubSub.releaseSubscriber`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `TxPubSub.releaseSubscriber`, execute it explicitly, and assert its semantic success value or captured failure.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.
