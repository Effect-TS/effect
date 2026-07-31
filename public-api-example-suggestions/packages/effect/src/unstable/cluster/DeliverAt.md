# Example Suggestions: `effect/unstable/cluster/DeliverAt`

- **Package:** `effect`
- **Source:** `packages/effect/src/unstable/cluster/DeliverAt.ts`
- **Uncovered API records:** 4
- **Priorities:** 0 required, 1 recommended, 2 optional, 1 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                             | Line | Kind               | Priority        |
| ----------------------------------------------- | ---: | ------------------ | --------------- |
| `effect/unstable/cluster/DeliverAt.isDeliverAt` |   44 | `root-declaration` | **recommended** |
| `effect/unstable/cluster/DeliverAt.toMillis`    |   53 | `root-declaration` | **optional**    |
| `effect/unstable/cluster/DeliverAt.DeliverAt`   |   33 | `root-declaration` | **optional**    |
| `effect/unstable/cluster/DeliverAt.symbol`      |   23 | `root-declaration` | **discouraged** |

## Recommended

### `effect/unstable/cluster/DeliverAt.isDeliverAt`

- **Source:** `packages/effect/src/unstable/cluster/DeliverAt.ts:44`
- **Kind / category:** `root-declaration` / `guards`
- **Priority:** **recommended**
- **Current description:** Returns `true` if the value implements the `DeliverAt` scheduled-delivery protocol.
- **Signature hint:** `declare function isDeliverAt(self: unknown): self is DeliverAt`
- **Import guidance:** Start from `import { DeliverAt } from "effect/unstable/cluster"` and use `DeliverAt.isDeliverAt`.
- **Suggested snippet:** Create one matching public value and one non-matching value accepted by the parameter type, call `DeliverAt.isDeliverAt` for both, and access a narrowed property in the true branch to demonstrate the type predicate.
- **Optional contrast:** Use one matching and one non-matching value from the accepted input domain.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

## Optional

### `effect/unstable/cluster/DeliverAt.toMillis`

- **Source:** `packages/effect/src/unstable/cluster/DeliverAt.ts:53`
- **Kind / category:** `root-declaration` / `accessors`
- **Priority:** **optional**
- **Current description:** Returns the scheduled delivery time in epoch milliseconds when the value implements `DeliverAt`, or `null` otherwise.
- **Signature hint:** `declare function toMillis(self: unknown): number | null`
- **Import guidance:** Start from `import { DeliverAt } from "effect/unstable/cluster"` and use `DeliverAt.toMillis`.
- **Suggested snippet:** Create a representative input through a public constructor, convert it with `DeliverAt.toMillis`, and assert a stable semantic output rather than console formatting or incidental metadata.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cluster/DeliverAt.DeliverAt`

- **Source:** `packages/effect/src/unstable/cluster/DeliverAt.ts:33`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Interface for payloads that specify when a cluster message should be delivered by returning the target delivery `DateTime` through the `DeliverAt` symbol method.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/cluster/DeliverAt.DeliverAt`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

## Discouraged

### `effect/unstable/cluster/DeliverAt.symbol`

- **Source:** `packages/effect/src/unstable/cluster/DeliverAt.ts:23`
- **Kind / category:** `root-declaration` / `symbols`
- **Priority:** **discouraged**
- **Current description:** Defines the property key used by values that provide a scheduled delivery time.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { DeliverAt } from "effect/unstable/cluster"` and use `DeliverAt.symbol`.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `DeliverAt.symbol` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.
