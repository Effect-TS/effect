# Example Suggestions: `@effect/atom-react/RegistryContext`

- **Package:** `@effect/atom-react`
- **Source:** `packages/atom/react/src/RegistryContext.ts`
- **Uncovered API records:** 3
- **Priorities:** 0 required, 0 recommended, 3 optional, 0 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                                   | Line | Kind               | Priority     |
| ----------------------------------------------------- | ---: | ------------------ | ------------ |
| `@effect/atom-react/RegistryContext.scheduleTask`     |   23 | `root-declaration` | **optional** |
| `@effect/atom-react/RegistryContext.RegistryContext`  |   44 | `root-declaration` | **optional** |
| `@effect/atom-react/RegistryContext.RegistryProvider` |   75 | `root-declaration` | **optional** |

## Optional

### `@effect/atom-react/RegistryContext.scheduleTask`

- **Source:** `packages/atom/react/src/RegistryContext.ts:23`
- **Kind / category:** `root-declaration` / `context`
- **Priority:** **optional**
- **Current description:** Schedules Atom registry work with React's scheduler at low priority and returns a cancellation function for the scheduled task.
- **Signature hint:** `declare function scheduleTask(f: () => void): () => void`
- **Import guidance:** Start from `import { scheduleTask } from "@effect/atom-react"` and use `scheduleTask`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Schedules Atom registry work with React's scheduler at low priority and returns a cancellation function for the scheduled task. Call `scheduleTask` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/atom-react/RegistryContext.RegistryContext`

- **Source:** `packages/atom/react/src/RegistryContext.ts:44`
- **Kind / category:** `root-declaration` / `context`
- **Priority:** **optional**
- **Current description:** Provides a React context that supplies the `AtomRegistry` used by Atom hooks and hydration helpers, defaulting to a standalone registry when no provider is present.
- **Signature hint:** `declare function RegistryContext(props: React.ProviderProps<AtomRegistry.AtomRegistry>): React.ReactNode`
- **Import guidance:** Start from `import { RegistryContext } from "@effect/atom-react"` and use `RegistryContext`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Provides a React context that supplies the `AtomRegistry` used by Atom hooks and hydration helpers, defaulting to a standalone registry when no provider is present. Call `RegistryContext` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/atom-react/RegistryContext.RegistryProvider`

- **Source:** `packages/atom/react/src/RegistryContext.ts:75`
- **Kind / category:** `root-declaration` / `context`
- **Priority:** **optional**
- **Current description:** Provides a stable `AtomRegistry` to a React subtree, optionally seeding initial atom values and overriding registry scheduling or idle settings.
- **Signature hint:** `declare function RegistryProvider(options: { readonly children?: React.ReactNode | undefined; readonly initialValues?: Iterable<readonly [Atom.Atom<any>, any]> | undefined; readonly scheduleTask?: ((f: () => void) => () => void) | undefined; readonly timeoutResolution?: number | undefined; readonly defaultIdleTTL?: number | undefined; }): React.FunctionComponentElement<React.ProviderProps<AtomRegistry.AtomRegistry>>`
- **Import guidance:** Start from `import { RegistryProvider } from "@effect/atom-react"` and use `RegistryProvider`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Provides a stable `AtomRegistry` to a React subtree, optionally seeding initial atom values and overriding registry scheduling or idle settings. Call `RegistryProvider` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.
