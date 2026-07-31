# Example Suggestions: `@effect/atom-react/ReactHydration`

- **Package:** `@effect/atom-react`
- **Source:** `packages/atom/react/src/ReactHydration.ts`
- **Uncovered API records:** 2
- **Priorities:** 0 required, 0 recommended, 2 optional, 0 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                                        | Line | Kind               | Priority     |
| ---------------------------------------------------------- | ---: | ------------------ | ------------ |
| `@effect/atom-react/ReactHydration.HydrationBoundaryProps` |   22 | `root-declaration` | **optional** |
| `@effect/atom-react/ReactHydration.HydrationBoundary`      |   48 | `root-declaration` | **optional** |

## Optional

### `@effect/atom-react/ReactHydration.HydrationBoundaryProps`

- **Source:** `packages/atom/react/src/ReactHydration.ts:22`
- **Kind / category:** `root-declaration` / `components`
- **Priority:** **optional**
- **Current description:** Props for a boundary that applies dehydrated Atom values to the nearest `RegistryContext` while rendering its children.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `@effect/atom-react/ReactHydration.HydrationBoundaryProps`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/atom-react/ReactHydration.HydrationBoundary`

- **Source:** `packages/atom/react/src/ReactHydration.ts:48`
- **Kind / category:** `root-declaration` / `components`
- **Priority:** **optional**
- **Current description:** Provides a React hydration boundary that loads dehydrated Atom values into the current Atom registry.
- **Signature hint:** `declare function HydrationBoundary(props: HydrationBoundaryProps): React.ReactNode | Promise<React.ReactNode>`
- **Import guidance:** Start from `import { HydrationBoundary } from "@effect/atom-react"` and use `HydrationBoundary`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Provides a React hydration boundary that loads dehydrated Atom values into the current Atom registry. Call `HydrationBoundary` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.
