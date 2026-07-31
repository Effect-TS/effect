# Example Suggestions: `effect/SchemaError`

- **Package:** `effect`
- **Source:** `packages/effect/src/SchemaError.ts`
- **Uncovered API records:** 1
- **Priorities:** 0 required, 1 recommended, 0 optional, 0 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                | Line | Kind               | Priority        |
| ---------------------------------- | ---: | ------------------ | --------------- |
| `effect/SchemaError.isSchemaError` |   61 | `root-declaration` | **recommended** |

## Recommended

### `effect/SchemaError.isSchemaError`

- **Source:** `packages/effect/src/SchemaError.ts:61`
- **Kind / category:** `root-declaration` / `guards`
- **Priority:** **recommended**
- **Current description:** Returns `true` if `u` is a `SchemaError`.
- **Signature hint:** `declare function isSchemaError(u: unknown): u is SchemaError`
- **Import guidance:** Start from `import { SchemaError } from "effect"` and use `SchemaError.isSchemaError`.
- **Suggested snippet:** Create one matching public value and one non-matching value accepted by the parameter type, call `SchemaError.isSchemaError` for both, and access a narrowed property in the true branch to demonstrate the type predicate.
- **Optional contrast:** Use one matching and one non-matching value from the accepted input domain.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.
