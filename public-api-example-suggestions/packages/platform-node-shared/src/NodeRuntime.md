# Example Suggestions: `@effect/platform-node-shared/NodeRuntime`

- **Package:** `@effect/platform-node-shared`
- **Source:** `packages/platform-node-shared/src/NodeRuntime.ts`
- **Uncovered API records:** 1
- **Priorities:** 0 required, 1 recommended, 0 optional, 0 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                                | Line | Kind               | Priority        |
| -------------------------------------------------- | ---: | ------------------ | --------------- |
| `@effect/platform-node-shared/NodeRuntime.runMain` |   22 | `root-declaration` | **recommended** |

## Recommended

### `@effect/platform-node-shared/NodeRuntime.runMain`

- **Source:** `packages/platform-node-shared/src/NodeRuntime.ts:22`
- **Kind / category:** `root-declaration` / `running`
- **Priority:** **recommended**
- **Current description:** Runs an Effect as the Node process main program, interrupting the fiber on `SIGINT` or `SIGTERM` and invoking the configured teardown to determine the process exit code.
- **Signature hint:** `declare function runMain(options?: { readonly disableErrorReporting?: boolean | undefined; readonly teardown?: Runtime.Teardown | undefined; }): <E, A>(effect: Effect<A, E>) => void declare function runMain<E, A>(effect: Effect<A, E>, options?: { readonly disableErrorReporting?: boolean | undefined; readonly teardown?: Runtime.Teardown | undefined; }): void`
- **Import guidance:** Start from `import { NodeRuntime } from "@effect/platform-node-shared"` and use `NodeRuntime.runMain`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Runs an Effect as the Node process main program, interrupting the fiber on `SIGINT` or `SIGTERM` and invoking the configured teardown to determine the process exit code. Call `NodeRuntime.runMain` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Optional contrast:** Use `TestClock` or explicit synchronization rather than elapsed wall time.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.
