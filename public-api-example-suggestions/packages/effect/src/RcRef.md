# Example Suggestions: `effect/RcRef`

- **Package:** `effect`
- **Source:** `packages/effect/src/RcRef.ts`
- **Uncovered API records:** 2
- **Priorities:** 0 required, 1 recommended, 0 optional, 1 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                           | Line | Kind                    | Priority        |
| ----------------------------- | ---: | ----------------------- | --------------- |
| `effect/RcRef.invalidate`     |  236 | `root-declaration`      | **recommended** |
| `effect/RcRef.RcRef.Variance` |  105 | `namespace-declaration` | **discouraged** |

## Recommended

### `effect/RcRef.invalidate`

- **Source:** `packages/effect/src/RcRef.ts:236`
- **Kind / category:** `root-declaration` / `combinators`
- **Priority:** **recommended**
- **Current description:** Invalidates the currently cached resource, if one has been acquired.
- **Signature hint:** `declare function invalidate<A, E>(self: RcRef<A, E>): Effect.Effect<void>`
- **Import guidance:** Start from `import { RcRef } from "effect"` and use `RcRef.invalidate`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `RcRef.invalidate`, execute it explicitly, and assert its semantic success value or captured failure.
- **Optional contrast:** Record acquisition and release events and assert cleanup after the scope closes.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

## Discouraged

### `effect/RcRef.RcRef.Variance`

- **Source:** `packages/effect/src/RcRef.ts:105`
- **Kind / category:** `namespace-declaration` / `models`
- **Priority:** **discouraged**
- **Current description:** Type-level variance marker for `RcRef`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `effect/RcRef.RcRef.Variance` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.
