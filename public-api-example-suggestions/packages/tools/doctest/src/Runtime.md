# Example Suggestions: `@effect/doctest/Runtime`

- **Package:** `@effect/doctest`
- **Source:** `packages/tools/doctest/src/Runtime.ts`
- **Uncovered API records:** 2
- **Priorities:** 0 required, 1 recommended, 1 optional, 0 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                    | Line | Kind               | Priority        |
| -------------------------------------- | ---: | ------------------ | --------------- |
| `@effect/doctest/Runtime.assertEquals` |   15 | `root-declaration` | **recommended** |
| `@effect/doctest/Runtime.test`         |   28 | `root-declaration` | **optional**    |

## Recommended

### `@effect/doctest/Runtime.assertEquals`

- **Source:** `packages/tools/doctest/src/Runtime.ts:15`
- **Kind / category:** `root-declaration` / `testing`
- **Priority:** **recommended**
- **Current description:** Asserts that two values are equal using Effect's equality semantics.
- **Signature hint:** `declare function assertEquals<A>(actual: A, expected: A): void`
- **Import guidance:** Start from `import { Runtime } from "@effect/doctest"` and use `Runtime.assertEquals`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Asserts that two values are equal using Effect's equality semantics. Call `Runtime.assertEquals` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

## Optional

### `@effect/doctest/Runtime.test`

- **Source:** `packages/tools/doctest/src/Runtime.ts:28`
- **Kind / category:** `root-declaration` / `testing`
- **Priority:** **optional**
- **Current description:** Registers a documentation snippet as a test.
- **Signature hint:** `declare function test(name: string, run: () => unknown | PromiseLike<unknown>): void`
- **Import guidance:** Start from `import { Runtime } from "@effect/doctest"` and use `Runtime.test`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Registers a documentation snippet as a test. Call `Runtime.test` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.
