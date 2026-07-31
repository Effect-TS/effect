# Example Suggestions: `effect/Redactable`

- **Package:** `effect`
- **Source:** `packages/effect/src/Redactable.ts`
- **Uncovered API records:** 3
- **Priorities:** 0 required, 2 recommended, 1 optional, 0 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                              | Line | Kind               | Priority        |
| -------------------------------- | ---: | ------------------ | --------------- |
| `effect/Redactable.isRedactable` |  105 | `root-declaration` | **recommended** |
| `effect/Redactable.getRedacted`  |  159 | `root-declaration` | **recommended** |
| `effect/Redactable.redact`       |  131 | `root-declaration` | **optional**    |

## Recommended

### `effect/Redactable.isRedactable`

- **Source:** `packages/effect/src/Redactable.ts:105`
- **Kind / category:** `root-declaration` / `guards`
- **Priority:** **recommended**
- **Current description:** Type guard that checks whether a value implements the `Redactable` interface.
- **Signature hint:** `declare function isRedactable(u: unknown): u is Redactable`
- **Import guidance:** Start from `import { Redactable } from "effect"` and use `Redactable.isRedactable`.
- **Suggested snippet:** Create one matching public value and one non-matching value accepted by the parameter type, call `Redactable.isRedactable` for both, and access a narrowed property in the true branch to demonstrate the type predicate.
- **Optional contrast:** Use one matching and one non-matching value from the accepted input domain.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/Redactable.getRedacted`

- **Source:** `packages/effect/src/Redactable.ts:159`
- **Kind / category:** `root-declaration` / `destructors`
- **Priority:** **recommended**
- **Current description:** Returns the result of calling `[symbolRedactable]` on a value that is already known to be `Redactable`.
- **Signature hint:** `declare function getRedacted(redactable: Redactable): unknown`
- **Import guidance:** Start from `import { Redactable } from "effect"` and use `Redactable.getRedacted`.
- **Suggested snippet:** Create a small representative input, call `Redactable.getRedacted`, and assert the returned value. Include a missing or empty case only when the return type models absence or failure.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

## Optional

### `effect/Redactable.redact`

- **Source:** `packages/effect/src/Redactable.ts:131`
- **Kind / category:** `root-declaration` / `destructors`
- **Priority:** **optional**
- **Current description:** Returns a redacted value if it implements `Redactable`, otherwise returns it unchanged.
- **Signature hint:** `declare function redact(u: unknown): unknown`
- **Import guidance:** Start from `import { Redactable } from "effect"` and use `Redactable.redact`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Returns a redacted value if it implements `Redactable`, otherwise returns it unchanged. Call `Redactable.redact` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.
