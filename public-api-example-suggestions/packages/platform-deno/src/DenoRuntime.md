# Example Suggestions: `@effect/platform-deno/DenoRuntime`

- **Package:** `@effect/platform-deno`
- **Source:** `packages/platform-deno/src/DenoRuntime.ts`
- **Uncovered API records:** 1
- **Priorities:** 0 required, 1 recommended, 0 optional, 0 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                         | Line | Kind               | Priority        |
| ------------------------------------------- | ---: | ------------------ | --------------- |
| `@effect/platform-deno/DenoRuntime.runMain` |   17 | `root-declaration` | **recommended** |

## Recommended

### `@effect/platform-deno/DenoRuntime.runMain`

- **Source:** `packages/platform-deno/src/DenoRuntime.ts:17`
- **Kind / category:** `root-declaration` / `running`
- **Priority:** **recommended**
- **Current description:** Run an Effect as the entrypoint to a Deno application.
- **Signature hint:** `declare function runMain(options?: { readonly disableErrorReporting?: boolean | undefined; readonly teardown?: Runtime.Teardown | undefined; }): <E, A>(effect: Effect<A, E>) => void declare function runMain<E, A>(effect: Effect<A, E>, options?: { readonly disableErrorReporting?: boolean | undefined; readonly teardown?: Runtime.Teardown | undefined; }): void`
- **Import guidance:** Start from `import { DenoRuntime } from "@effect/platform-deno"` and use `DenoRuntime.runMain`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Run an Effect as the entrypoint to a Deno application. Call `DenoRuntime.runMain` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.
