# Example Suggestions: `effect/Duration`

- **Package:** `effect`
- **Source:** `packages/effect/src/Duration.ts`
- **Uncovered API records:** 7
- **Priorities:** 0 required, 3 recommended, 4 optional, 0 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                             | Line | Kind               | Priority        |
| ------------------------------- | ---: | ------------------ | --------------- |
| `effect/Duration.ReducerSum`    | 1743 | `root-declaration` | **recommended** |
| `effect/Duration.CombinerMax`   | 1758 | `root-declaration` | **recommended** |
| `effect/Duration.CombinerMin`   | 1773 | `root-declaration` | **recommended** |
| `effect/Duration.Duration`      |   70 | `root-declaration` | **optional**    |
| `effect/Duration.DurationValue` |   96 | `root-declaration` | **optional**    |
| `effect/Duration.Unit`          |  115 | `root-declaration` | **optional**    |
| `effect/Duration.Input`         |  158 | `root-declaration` | **optional**    |

## Recommended

### `effect/Duration.ReducerSum`

- **Source:** `packages/effect/src/Duration.ts:1743`
- **Kind / category:** `root-declaration` / `math`
- **Priority:** **recommended**
- **Current description:** Reducer for summing `Duration`s.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Duration } from "effect"` and use `Duration.ReducerSum`.
- **Suggested snippet:** Apply `Duration.ReducerSum` to a minimal value with a transformation that visibly changes the result, then assert the complete semantic output. Add a second case only for a documented empty or failure distinction.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/Duration.CombinerMax`

- **Source:** `packages/effect/src/Duration.ts:1758`
- **Kind / category:** `root-declaration` / `math`
- **Priority:** **recommended**
- **Current description:** Combiner that returns the maximum `Duration`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Duration } from "effect"` and use `Duration.CombinerMax`.
- **Suggested snippet:** Apply `Duration.CombinerMax` to a minimal value with a transformation that visibly changes the result, then assert the complete semantic output. Add a second case only for a documented empty or failure distinction.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/Duration.CombinerMin`

- **Source:** `packages/effect/src/Duration.ts:1773`
- **Kind / category:** `root-declaration` / `math`
- **Priority:** **recommended**
- **Current description:** Combiner that returns the minimum `Duration`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Duration } from "effect"` and use `Duration.CombinerMin`.
- **Suggested snippet:** Apply `Duration.CombinerMin` to a minimal value with a transformation that visibly changes the result, then assert the complete semantic output. Add a second case only for a documented empty or failure distinction.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

## Optional

### `effect/Duration.Duration`

- **Source:** `packages/effect/src/Duration.ts:70`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Represents a span of time with high precision, supporting operations from nanoseconds to weeks.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Duration.Duration`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Duration.DurationValue`

- **Source:** `packages/effect/src/Duration.ts:96`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Tagged representation of a `Duration` value.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Duration.DurationValue`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Duration.Unit`

- **Source:** `packages/effect/src/Duration.ts:115`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Valid time units that can be used in duration string representations.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Duration.Unit`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Duration.Input`

- **Source:** `packages/effect/src/Duration.ts:158`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Valid input types that can be converted to a Duration.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Duration.Input`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.
