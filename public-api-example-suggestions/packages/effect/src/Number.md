# Example Suggestions: `effect/Number`

- **Package:** `effect`
- **Source:** `packages/effect/src/Number.ts`
- **Uncovered API records:** 5
- **Priorities:** 0 required, 4 recommended, 1 optional, 0 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                             | Line | Kind               | Priority        |
| ------------------------------- | ---: | ------------------ | --------------- |
| `effect/Number.ReducerSum`      |  782 | `root-declaration` | **recommended** |
| `effect/Number.ReducerMultiply` |  805 | `root-declaration` | **recommended** |
| `effect/Number.ReducerMax`      |  836 | `root-declaration` | **recommended** |
| `effect/Number.ReducerMin`      |  860 | `root-declaration` | **recommended** |
| `effect/Number.Number`          |   45 | `root-declaration` | **optional**    |

## Recommended

### `effect/Number.ReducerSum`

- **Source:** `packages/effect/src/Number.ts:782`
- **Kind / category:** `root-declaration` / `math`
- **Priority:** **recommended**
- **Current description:** Reducer for combining `number`s using addition.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Number } from "effect"` and use `Number.ReducerSum`.
- **Suggested snippet:** Apply `Number.ReducerSum` to a minimal value with a transformation that visibly changes the result, then assert the complete semantic output. Add a second case only for a documented empty or failure distinction.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/Number.ReducerMultiply`

- **Source:** `packages/effect/src/Number.ts:805`
- **Kind / category:** `root-declaration` / `math`
- **Priority:** **recommended**
- **Current description:** Reducer for combining `number`s using multiplication.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Number } from "effect"` and use `Number.ReducerMultiply`.
- **Suggested snippet:** Apply `Number.ReducerMultiply` to a minimal value with a transformation that visibly changes the result, then assert the complete semantic output. Add a second case only for a documented empty or failure distinction.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/Number.ReducerMax`

- **Source:** `packages/effect/src/Number.ts:836`
- **Kind / category:** `root-declaration` / `math`
- **Priority:** **recommended**
- **Current description:** Reducer for reducing `number`s by keeping the maximum value.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Number } from "effect"` and use `Number.ReducerMax`.
- **Suggested snippet:** Apply `Number.ReducerMax` to a minimal value with a transformation that visibly changes the result, then assert the complete semantic output. Add a second case only for a documented empty or failure distinction.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/Number.ReducerMin`

- **Source:** `packages/effect/src/Number.ts:860`
- **Kind / category:** `root-declaration` / `math`
- **Priority:** **recommended**
- **Current description:** Reducer for reducing `number`s by keeping the minimum value.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Number } from "effect"` and use `Number.ReducerMin`.
- **Suggested snippet:** Apply `Number.ReducerMin` to a minimal value with a transformation that visibly changes the result, then assert the complete semantic output. Add a second case only for a documented empty or failure distinction.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

## Optional

### `effect/Number.Number`

- **Source:** `packages/effect/src/Number.ts:45`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **optional**
- **Current description:** Exposes the global number constructor.
- **Signature hint:** `declare function Number(value?: any): number`
- **Import guidance:** Start from `import { Number } from "effect"` and use `Number.Number`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Exposes the global number constructor. Call `Number.Number` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.
