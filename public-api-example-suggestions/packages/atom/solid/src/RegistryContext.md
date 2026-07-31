# Example Suggestions: `@effect/atom-solid/RegistryContext`

- **Package:** `@effect/atom-solid`
- **Source:** `packages/atom/solid/src/RegistryContext.ts`
- **Uncovered API records:** 2
- **Priorities:** 0 required, 0 recommended, 2 optional, 0 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                                   | Line | Kind               | Priority     |
| ----------------------------------------------------- | ---: | ------------------ | ------------ |
| `@effect/atom-solid/RegistryContext.RegistryContext`  |   32 | `root-declaration` | **optional** |
| `@effect/atom-solid/RegistryContext.RegistryProvider` |   60 | `root-declaration` | **optional** |

## Optional

### `@effect/atom-solid/RegistryContext.RegistryContext`

- **Source:** `packages/atom/solid/src/RegistryContext.ts:32`
- **Kind / category:** `root-declaration` / `context`
- **Priority:** **optional**
- **Current description:** Provides a Solid context that carries the `AtomRegistry` used by atom hooks in the current owner tree.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { RegistryContext } from "@effect/atom-solid"` and use `RegistryContext`.
- **Suggested snippet:** Use `RegistryContext` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/atom-solid/RegistryContext.RegistryProvider`

- **Source:** `packages/atom/solid/src/RegistryContext.ts:60`
- **Kind / category:** `root-declaration` / `context`
- **Priority:** **optional**
- **Current description:** Creates an `AtomRegistry` for a Solid subtree, optionally seeding initial atom values and scheduler settings, and disposes the registry when the owner is cleaned up.
- **Signature hint:** `declare function RegistryProvider(options: { readonly children?: JSX.Element | undefined; readonly initialValues?: Iterable<readonly [Atom.Atom<any>, any]> | undefined; readonly scheduleTask?: ((f: () => void) => () => void) | undefined; readonly timeoutResolution?: number | undefined; readonly defaultIdleTTL?: number | undefined; }): JSX.Element`
- **Import guidance:** Start from `import { RegistryProvider } from "@effect/atom-solid"` and use `RegistryProvider`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Creates an `AtomRegistry` for a Solid subtree, optionally seeding initial atom values and scheduler settings, and disposes the registry when the owner is cleaned up. Call `RegistryProvider` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.
