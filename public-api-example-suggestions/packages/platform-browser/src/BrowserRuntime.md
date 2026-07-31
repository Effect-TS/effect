# Example Suggestions: `@effect/platform-browser/BrowserRuntime`

- **Package:** `@effect/platform-browser`
- **Source:** `packages/platform-browser/src/BrowserRuntime.ts`
- **Uncovered API records:** 1
- **Priorities:** 1 required, 0 recommended, 0 optional, 0 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                               | Line | Kind               | Priority     |
| ------------------------------------------------- | ---: | ------------------ | ------------ |
| `@effect/platform-browser/BrowserRuntime.runMain` |   35 | `root-declaration` | **required** |

## Required

### `@effect/platform-browser/BrowserRuntime.runMain`

- **Source:** `packages/platform-browser/src/BrowserRuntime.ts:35`
- **Kind / category:** `root-declaration` / `Runtime`
- **Priority:** **required**
- **Current description:** Runs an effect as the browser main program and interrupts its fiber when the page receives a `beforeunload` event.
- **Signature hint:** `declare function runMain(options?: { readonly disableErrorReporting?: boolean | undefined; readonly teardown?: Teardown | undefined; }): <E, A>(effect: Effect.Effect<A, E>) => void declare function runMain<E, A>(effect: Effect.Effect<A, E>, options?: { readonly disableErrorReporting?: boolean | undefined; readonly teardown?: Teardown | undefined; }): void`
- **Import guidance:** Start from `import { BrowserRuntime } from "@effect/platform-browser"` and use `BrowserRuntime.runMain`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Runs an effect as the browser main program and interrupts its fiber when the page receives a `beforeunload` event. Call `BrowserRuntime.runMain` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Optional contrast:** Use `TestClock` or explicit synchronization rather than elapsed wall time.
- **Future-agent advice:** Inspect implementation and targeted tests first; preserve lifecycle and failure semantics and validate with doctest plus package-local docgen.
