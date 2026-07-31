# Example Suggestions: `effect/Effectable`

- **Package:** `effect`
- **Source:** `packages/effect/src/Effectable.ts`
- **Uncovered API records:** 2
- **Priorities:** 0 required, 1 recommended, 0 optional, 1 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                           | Line | Kind               | Priority        |
| ----------------------------- | ---: | ------------------ | --------------- |
| `effect/Effectable.Class`     |   66 | `root-declaration` | **recommended** |
| `effect/Effectable.Prototype` |   31 | `root-declaration` | **discouraged** |

## Recommended

### `effect/Effectable.Class`

- **Source:** `packages/effect/src/Effectable.ts:66`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **recommended**
- **Current description:** Provides an abstract class that can be extended to create an `Effect`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Effectable } from "effect"` and use `Effectable.Class`.
- **Suggested snippet:** Use `Effectable.Class` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

## Discouraged

### `effect/Effectable.Prototype`

- **Source:** `packages/effect/src/Effectable.ts:31`
- **Kind / category:** `root-declaration` / `prototypes`
- **Priority:** **discouraged**
- **Current description:** Create a low-level `Effect` prototype.
- **Signature hint:** `declare function Prototype<A extends Effect.Effect<any, any, any>>(options: { readonly label: string; readonly evaluate: (this: A, fiber: Fiber.Fiber<any, any>) => Effect.Effect<Effect.Success<A>, Effect.Error<A>, Effect.Services<A>>; }): Effect.Effect<Effect.Success<A>, Effect.Error<A>, Effect.Services<A>>`
- **Import guidance:** Start from `import { Effectable } from "effect"` and use `Effectable.Prototype`.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `Effectable.Prototype` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.
