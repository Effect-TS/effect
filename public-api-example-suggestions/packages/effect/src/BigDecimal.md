# Example Suggestions: `effect/BigDecimal`

- **Package:** `effect`
- **Source:** `packages/effect/src/BigDecimal.ts`
- **Uncovered API records:** 2
- **Priorities:** 0 required, 0 recommended, 2 optional, 0 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                              | Line | Kind               | Priority     |
| -------------------------------- | ---: | ------------------ | ------------ |
| `effect/BigDecimal.RoundingMode` | 1598 | `root-declaration` | **optional** |
| `effect/BigDecimal.ceil`         | 1752 | `root-declaration` | **optional** |

## Optional

### `effect/BigDecimal.RoundingMode`

- **Source:** `packages/effect/src/BigDecimal.ts:1598`
- **Kind / category:** `root-declaration` / `math`
- **Priority:** **optional**
- **Current description:** Rounding modes for `BigDecimal`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/BigDecimal.RoundingMode`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/BigDecimal.ceil`

- **Source:** `packages/effect/src/BigDecimal.ts:1752`
- **Kind / category:** `root-declaration` / `math`
- **Priority:** **optional**
- **Current description:** Computes the ceiling of a `BigDecimal` at the given scale.
- **Signature hint:** `declare function ceil(scale: number): (self: BigDecimal) => BigDecimal declare function ceil(self: BigDecimal, scale?: number): BigDecimal`
- **Import guidance:** Start from `import { BigDecimal } from "effect"` and use `BigDecimal.ceil`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Computes the ceiling of a `BigDecimal` at the given scale. Call `BigDecimal.ceil` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.
