# Example Suggestions: `effect/Boolean`

- **Package:** `effect`
- **Source:** `packages/effect/src/Boolean.ts`
- **Uncovered API records:** 2
- **Priorities:** 0 required, 2 recommended, 0 optional, 0 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                         | Line | Kind               | Priority        |
| --------------------------- | ---: | ------------------ | --------------- |
| `effect/Boolean.ReducerAnd` |  441 | `root-declaration` | **recommended** |
| `effect/Boolean.ReducerOr`  |  461 | `root-declaration` | **recommended** |

## Recommended

### `effect/Boolean.ReducerAnd`

- **Source:** `packages/effect/src/Boolean.ts:441`
- **Kind / category:** `root-declaration` / `math`
- **Priority:** **recommended**
- **Current description:** Reducer for combining `boolean`s using AND.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Boolean } from "effect"` and use `Boolean.ReducerAnd`.
- **Suggested snippet:** Apply `Boolean.ReducerAnd` to a minimal value with a transformation that visibly changes the result, then assert the complete semantic output. Add a second case only for a documented empty or failure distinction.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/Boolean.ReducerOr`

- **Source:** `packages/effect/src/Boolean.ts:461`
- **Kind / category:** `root-declaration` / `math`
- **Priority:** **recommended**
- **Current description:** Reducer for combining `boolean`s using OR.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Boolean } from "effect"` and use `Boolean.ReducerOr`.
- **Suggested snippet:** Apply `Boolean.ReducerOr` to a minimal value with a transformation that visibly changes the result, then assert the complete semantic output. Add a second case only for a documented empty or failure distinction.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.
