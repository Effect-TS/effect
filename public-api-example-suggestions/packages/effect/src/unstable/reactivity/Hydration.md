# Example Suggestions: `effect/unstable/reactivity/Hydration`

- **Package:** `effect`
- **Source:** `packages/effect/src/unstable/reactivity/Hydration.ts`
- **Uncovered API records:** 5
- **Priorities:** 0 required, 0 recommended, 5 optional, 0 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                                        | Line | Kind               | Priority     |
| ---------------------------------------------------------- | ---: | ------------------ | ------------ |
| `effect/unstable/reactivity/Hydration.dehydrate`           |   59 | `root-declaration` | **optional** |
| `effect/unstable/reactivity/Hydration.toValues`            |  109 | `root-declaration` | **optional** |
| `effect/unstable/reactivity/Hydration.hydrate`             |  128 | `root-declaration` | **optional** |
| `effect/unstable/reactivity/Hydration.DehydratedAtom`      |   23 | `root-declaration` | **optional** |
| `effect/unstable/reactivity/Hydration.DehydratedAtomValue` |   39 | `root-declaration` | **optional** |

## Optional

### `effect/unstable/reactivity/Hydration.dehydrate`

- **Source:** `packages/effect/src/unstable/reactivity/Hydration.ts:59`
- **Kind / category:** `root-declaration` / `dehydration`
- **Priority:** **optional**
- **Current description:** Encodes the serializable atoms currently stored in a registry into dehydrated state.
- **Signature hint:** `declare function dehydrate(registry: AtomRegistry.AtomRegistry, options?: { readonly encodeInitialAs?: 'ignore' | 'promise' | 'value-only' | undefined; }): Array<DehydratedAtom>`
- **Import guidance:** Start from `import { Hydration } from "effect/unstable/reactivity"` and use `Hydration.dehydrate`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Encodes the serializable atoms currently stored in a registry into dehydrated state. Call `Hydration.dehydrate` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/reactivity/Hydration.toValues`

- **Source:** `packages/effect/src/unstable/reactivity/Hydration.ts:109`
- **Kind / category:** `root-declaration` / `dehydration`
- **Priority:** **optional**
- **Current description:** Returns dehydrated state entries as `DehydratedAtomValue` records.
- **Signature hint:** `declare function toValues(state: ReadonlyArray<DehydratedAtom>): Array<DehydratedAtomValue>`
- **Import guidance:** Start from `import { Hydration } from "effect/unstable/reactivity"` and use `Hydration.toValues`.
- **Suggested snippet:** Create a representative input through a public constructor, convert it with `Hydration.toValues`, and assert a stable semantic output rather than console formatting or incidental metadata.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/reactivity/Hydration.hydrate`

- **Source:** `packages/effect/src/unstable/reactivity/Hydration.ts:128`
- **Kind / category:** `root-declaration` / `hydration`
- **Priority:** **optional**
- **Current description:** Applies dehydrated atom state to a registry.
- **Signature hint:** `declare function hydrate(registry: AtomRegistry.AtomRegistry, dehydratedState: Iterable<DehydratedAtom>): void`
- **Import guidance:** Start from `import { Hydration } from "effect/unstable/reactivity"` and use `Hydration.hydrate`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Applies dehydrated atom state to a registry. Call `Hydration.hydrate` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/reactivity/Hydration.DehydratedAtom`

- **Source:** `packages/effect/src/unstable/reactivity/Hydration.ts:23`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Marker interface for entries in a dehydrated atom registry state.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/reactivity/Hydration.DehydratedAtom`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/reactivity/Hydration.DehydratedAtomValue`

- **Source:** `packages/effect/src/unstable/reactivity/Hydration.ts:39`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** A dehydrated serializable atom value.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/reactivity/Hydration.DehydratedAtomValue`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.
