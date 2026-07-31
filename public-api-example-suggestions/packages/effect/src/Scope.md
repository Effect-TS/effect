# Example Suggestions: `effect/Scope`

- **Package:** `effect`
- **Source:** `packages/effect/src/Scope.ts`
- **Uncovered API records:** 2
- **Priorities:** 0 required, 1 recommended, 0 optional, 1 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                        | Line | Kind               | Priority        |
| -------------------------- | ---: | ------------------ | --------------- |
| `effect/Scope.use`         |  535 | `root-declaration` | **recommended** |
| `effect/Scope.closeUnsafe` |  511 | `root-declaration` | **discouraged** |

## Recommended

### `effect/Scope.use`

- **Source:** `packages/effect/src/Scope.ts:535`
- **Kind / category:** `root-declaration` / `combinators`
- **Priority:** **recommended**
- **Current description:** Runs an effect with the provided closeable scope in its context and closes that scope when the effect exits.
- **Signature hint:** `declare function use(scope: Closeable): <A, E, R>(self: Effect<A, E, R>) => Effect<A, E, Exclude<R, Scope>> declare function use<A, E, R>(self: Effect<A, E, R>, scope: Closeable): Effect<A, E, Exclude<R, Scope>>`
- **Import guidance:** Start from `import { Scope } from "effect"` and use `Scope.use`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `Scope.use`, execute it explicitly, and assert its semantic success value or captured failure.
- **Optional contrast:** Record acquisition and release events and assert cleanup after the scope closes.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

## Discouraged

### `effect/Scope.closeUnsafe`

- **Source:** `packages/effect/src/Scope.ts:511`
- **Kind / category:** `root-declaration` / `unsafe`
- **Priority:** **discouraged**
- **Current description:** Closes a scope unsafely with the provided exit value.
- **Signature hint:** `declare function closeUnsafe<A, E>(self: Scope, exit_: Exit<A, E>): Effect<void, never, never> | undefined`
- **Import guidance:** Start from `import { Scope } from "effect"` and use `Scope.closeUnsafe`.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `Scope.closeUnsafe` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.
