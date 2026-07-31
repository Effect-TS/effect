# Example Suggestions: `effect/Unify`

- **Package:** `effect`
- **Source:** `packages/effect/src/Unify.ts`
- **Uncovered API records:** 6
- **Priorities:** 0 required, 0 recommended, 0 optional, 6 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                 | Line | Kind               | Priority        |
| ----------------------------------- | ---: | ------------------ | --------------- |
| `effect/Unify.unifySymbol (value)`  |   35 | `root-declaration` | **discouraged** |
| `effect/Unify.unifySymbol (type)`   |   54 | `root-declaration` | **discouraged** |
| `effect/Unify.typeSymbol (value)`   |   74 | `root-declaration` | **discouraged** |
| `effect/Unify.typeSymbol (type)`    |   93 | `root-declaration` | **discouraged** |
| `effect/Unify.ignoreSymbol (value)` |  113 | `root-declaration` | **discouraged** |
| `effect/Unify.ignoreSymbol (type)`  |  132 | `root-declaration` | **discouraged** |

## Discouraged

### `effect/Unify.unifySymbol (value)`

- **Source:** `packages/effect/src/Unify.ts:35`
- **Kind / category:** `root-declaration` / `symbols`
- **Priority:** **discouraged**
- **Current description:** Defines the unique symbol used to identify unification behavior in Effect types.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Unify } from "effect"` and use `Unify.unifySymbol`.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `Unify.unifySymbol` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.

### `effect/Unify.unifySymbol (type)`

- **Source:** `packages/effect/src/Unify.ts:54`
- **Kind / category:** `root-declaration` / `symbols`
- **Priority:** **discouraged**
- **Current description:** The type of the unifySymbol.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `effect/Unify.unifySymbol` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.

### `effect/Unify.typeSymbol (value)`

- **Source:** `packages/effect/src/Unify.ts:74`
- **Kind / category:** `root-declaration` / `symbols`
- **Priority:** **discouraged**
- **Current description:** Defines the unique symbol used to identify the type information for unification.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Unify } from "effect"` and use `Unify.typeSymbol`.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `Unify.typeSymbol` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.

### `effect/Unify.typeSymbol (type)`

- **Source:** `packages/effect/src/Unify.ts:93`
- **Kind / category:** `root-declaration` / `symbols`
- **Priority:** **discouraged**
- **Current description:** The type of the typeSymbol.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `effect/Unify.typeSymbol` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.

### `effect/Unify.ignoreSymbol (value)`

- **Source:** `packages/effect/src/Unify.ts:113`
- **Kind / category:** `root-declaration` / `symbols`
- **Priority:** **discouraged**
- **Current description:** Defines the unique symbol used to specify types that should be ignored during unification.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Unify } from "effect"` and use `Unify.ignoreSymbol`.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `Unify.ignoreSymbol` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.

### `effect/Unify.ignoreSymbol (type)`

- **Source:** `packages/effect/src/Unify.ts:132`
- **Kind / category:** `root-declaration` / `symbols`
- **Priority:** **discouraged**
- **Current description:** The type of the ignoreSymbol.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `effect/Unify.ignoreSymbol` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.
