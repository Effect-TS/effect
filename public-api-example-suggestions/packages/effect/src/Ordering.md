# Example Suggestions: `effect/Ordering`

- **Package:** `effect`
- **Source:** `packages/effect/src/Ordering.ts`
- **Uncovered API records:** 1
- **Priorities:** 0 required, 1 recommended, 0 optional, 0 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                       | Line | Kind               | Priority        |
| ------------------------- | ---: | ------------------ | --------------- |
| `effect/Ordering.Reducer` |  169 | `root-declaration` | **recommended** |

## Recommended

### `effect/Ordering.Reducer`

- **Source:** `packages/effect/src/Ordering.ts:169`
- **Kind / category:** `root-declaration` / `ordering`
- **Priority:** **recommended**
- **Current description:** Reducer for combining `Ordering`s.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Ordering } from "effect"` and use `Ordering.Reducer`.
- **Suggested snippet:** Apply `Ordering.Reducer` to a minimal value with a transformation that visibly changes the result, then assert the complete semantic output. Add a second case only for a documented empty or failure distinction.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.
