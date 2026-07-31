# Example Suggestions: `effect/unstable/reactivity/AtomRef`

- **Package:** `effect`
- **Source:** `packages/effect/src/unstable/reactivity/AtomRef.ts`
- **Uncovered API records:** 7
- **Priorities:** 0 required, 0 recommended, 5 optional, 2 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                                 | Line | Kind               | Priority        |
| --------------------------------------------------- | ---: | ------------------ | --------------- |
| `effect/unstable/reactivity/AtomRef.make`           |   92 | `root-declaration` | **optional**    |
| `effect/unstable/reactivity/AtomRef.collection`     |  105 | `root-declaration` | **optional**    |
| `effect/unstable/reactivity/AtomRef.ReadonlyRef`    |   43 | `root-declaration` | **optional**    |
| `effect/unstable/reactivity/AtomRef.AtomRef`        |   62 | `root-declaration` | **optional**    |
| `effect/unstable/reactivity/AtomRef.Collection`     |   79 | `root-declaration` | **optional**    |
| `effect/unstable/reactivity/AtomRef.TypeId (type)`  |   21 | `root-declaration` | **discouraged** |
| `effect/unstable/reactivity/AtomRef.TypeId (value)` |   29 | `root-declaration` | **discouraged** |

## Optional

### `effect/unstable/reactivity/AtomRef.make`

- **Source:** `packages/effect/src/unstable/reactivity/AtomRef.ts:92`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **optional**
- **Current description:** Creates a mutable reactive reference initialized with the supplied value.
- **Signature hint:** `declare function make<A>(value: A): AtomRef<A>`
- **Import guidance:** Start from `import { AtomRef } from "effect/unstable/reactivity"` and use `AtomRef.make`.
- **Suggested snippet:** Construct one representative value with `AtomRef.make`, then pass it to the smallest canonical getter, matcher, or runner that exposes what was created. Do not merely assert an object kind.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/reactivity/AtomRef.collection`

- **Source:** `packages/effect/src/unstable/reactivity/AtomRef.ts:105`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **optional**
- **Current description:** Creates a reactive collection from an iterable of initial item values.
- **Signature hint:** `declare function collection<A>(items: Iterable<A>): Collection<A>`
- **Import guidance:** Start from `import { AtomRef } from "effect/unstable/reactivity"` and use `AtomRef.collection`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Creates a reactive collection from an iterable of initial item values. Call `AtomRef.collection` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/reactivity/AtomRef.ReadonlyRef`

- **Source:** `packages/effect/src/unstable/reactivity/AtomRef.ts:43`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** A read-only reactive reference.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/reactivity/AtomRef.ReadonlyRef`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/reactivity/AtomRef.AtomRef`

- **Source:** `packages/effect/src/unstable/reactivity/AtomRef.ts:62`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** A mutable reactive reference.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/reactivity/AtomRef.AtomRef`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/reactivity/AtomRef.Collection`

- **Source:** `packages/effect/src/unstable/reactivity/AtomRef.ts:79`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** A reactive collection of mutable item references.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/reactivity/AtomRef.Collection`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

## Discouraged

### `effect/unstable/reactivity/AtomRef.TypeId (type)`

- **Source:** `packages/effect/src/unstable/reactivity/AtomRef.ts:21`
- **Kind / category:** `root-declaration` / `type IDs`
- **Priority:** **discouraged**
- **Current description:** The literal type used to identify `AtomRef` values.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `effect/unstable/reactivity/AtomRef.TypeId` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.

### `effect/unstable/reactivity/AtomRef.TypeId (value)`

- **Source:** `packages/effect/src/unstable/reactivity/AtomRef.ts:29`
- **Kind / category:** `root-declaration` / `type IDs`
- **Priority:** **discouraged**
- **Current description:** The runtime type id used to identify `AtomRef` values.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { AtomRef } from "effect/unstable/reactivity"` and use `AtomRef.TypeId`.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `AtomRef.TypeId` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.
