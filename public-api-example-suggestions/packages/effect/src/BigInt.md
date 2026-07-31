# Example Suggestions: `effect/BigInt`

- **Package:** `effect`
- **Source:** `packages/effect/src/BigInt.ts`
- **Uncovered API records:** 5
- **Priorities:** 0 required, 4 recommended, 1 optional, 0 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                             | Line | Kind               | Priority        |
| ------------------------------- | ---: | ------------------ | --------------- |
| `effect/BigInt.ReducerSum`      |  945 | `root-declaration` | **recommended** |
| `effect/BigInt.ReducerMultiply` |  964 | `root-declaration` | **recommended** |
| `effect/BigInt.CombinerMax`     |  986 | `root-declaration` | **recommended** |
| `effect/BigInt.CombinerMin`     | 1001 | `root-declaration` | **recommended** |
| `effect/BigInt.BigInt`          |   49 | `root-declaration` | **optional**    |

## Recommended

### `effect/BigInt.ReducerSum`

- **Source:** `packages/effect/src/BigInt.ts:945`
- **Kind / category:** `root-declaration` / `math`
- **Priority:** **recommended**
- **Current description:** Reducer for combining `bigint`s using addition.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { BigInt } from "effect"` and use `BigInt.ReducerSum`.
- **Suggested snippet:** Apply `BigInt.ReducerSum` to a minimal value with a transformation that visibly changes the result, then assert the complete semantic output. Add a second case only for a documented empty or failure distinction.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/BigInt.ReducerMultiply`

- **Source:** `packages/effect/src/BigInt.ts:964`
- **Kind / category:** `root-declaration` / `math`
- **Priority:** **recommended**
- **Current description:** Reducer for combining `bigint`s using multiplication.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { BigInt } from "effect"` and use `BigInt.ReducerMultiply`.
- **Suggested snippet:** Apply `BigInt.ReducerMultiply` to a minimal value with a transformation that visibly changes the result, then assert the complete semantic output. Add a second case only for a documented empty or failure distinction.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/BigInt.CombinerMax`

- **Source:** `packages/effect/src/BigInt.ts:986`
- **Kind / category:** `root-declaration` / `math`
- **Priority:** **recommended**
- **Current description:** Combiner that returns the maximum `bigint`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { BigInt } from "effect"` and use `BigInt.CombinerMax`.
- **Suggested snippet:** Apply `BigInt.CombinerMax` to a minimal value with a transformation that visibly changes the result, then assert the complete semantic output. Add a second case only for a documented empty or failure distinction.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/BigInt.CombinerMin`

- **Source:** `packages/effect/src/BigInt.ts:1001`
- **Kind / category:** `root-declaration` / `math`
- **Priority:** **recommended**
- **Current description:** Combiner that returns the minimum `bigint`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { BigInt } from "effect"` and use `BigInt.CombinerMin`.
- **Suggested snippet:** Apply `BigInt.CombinerMin` to a minimal value with a transformation that visibly changes the result, then assert the complete semantic output. Add a second case only for a documented empty or failure distinction.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

## Optional

### `effect/BigInt.BigInt`

- **Source:** `packages/effect/src/BigInt.ts:49`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **optional**
- **Current description:** Exposes the global bigint constructor for JavaScript bigint coercion.
- **Signature hint:** `declare function BigInt(value: bigint | boolean | number | string): bigint`
- **Import guidance:** Start from `import { BigInt } from "effect"` and use `BigInt.BigInt`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Exposes the global bigint constructor for JavaScript bigint coercion. Call `BigInt.BigInt` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.
