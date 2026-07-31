# Example Suggestions: `@effect/atom-solid/Hooks`

- **Package:** `@effect/atom-solid`
- **Source:** `packages/atom/solid/src/Hooks.ts`
- **Uncovered API records:** 11
- **Priorities:** 0 required, 2 recommended, 9 optional, 0 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                             | Line | Kind               | Priority        |
| ----------------------------------------------- | ---: | ------------------ | --------------- |
| `@effect/atom-solid/Hooks.useAtomSet`           |  153 | `root-declaration` | **recommended** |
| `@effect/atom-solid/Hooks.useAtom`              |  209 | `root-declaration` | **recommended** |
| `@effect/atom-solid/Hooks.useAtomResource`      |  254 | `root-declaration` | **optional**    |
| `@effect/atom-solid/Hooks.useAtomInitialValues` |   39 | `root-declaration` | **optional**    |
| `@effect/atom-solid/Hooks.useAtomValue`         |   61 | `root-declaration` | **optional**    |
| `@effect/atom-solid/Hooks.useAtomMount`         |  142 | `root-declaration` | **optional**    |
| `@effect/atom-solid/Hooks.useAtomRefresh`       |  181 | `root-declaration` | **optional**    |
| `@effect/atom-solid/Hooks.useAtomSubscribe`     |  237 | `root-declaration` | **optional**    |
| `@effect/atom-solid/Hooks.useAtomRef`           |  294 | `root-declaration` | **optional**    |
| `@effect/atom-solid/Hooks.useAtomRefProp`       |  328 | `root-declaration` | **optional**    |
| `@effect/atom-solid/Hooks.useAtomRefPropValue`  |  358 | `root-declaration` | **optional**    |

## Recommended

### `@effect/atom-solid/Hooks.useAtomSet`

- **Source:** `packages/atom/solid/src/Hooks.ts:153`
- **Kind / category:** `root-declaration` / `hooks`
- **Priority:** **recommended**
- **Current description:** Returns a setter for a writable atom without subscribing to its value.
- **Signature hint:** `declare function useAtomSet<R, W, Mode extends 'value' | 'promise' | 'promiseExit' = never>(atom: () => Atom.Writable<R, W>, options?: { readonly mode?: ([R] extends [AsyncResult.AsyncResult<any, any>] ? Mode : 'value') | undefined; }): 'promise' extends Mode ? ((value: W) => Promise<AsyncResult.AsyncResult.Success<R>>) : 'promiseExit' extends Mode ? ((value: W) => Promise<Exit.Exit<AsyncResult.AsyncResult.Success<R>, AsyncResult.AsyncResult.Failure<R>>>) : ((value: W | ((value: R) => W)) => void)`
- **Import guidance:** Start from `import { useAtomSet } from "@effect/atom-solid"` and use `useAtomSet`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Returns a setter for a writable atom without subscribing to its value. Call `useAtomSet` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Optional contrast:** Use `TestClock` or explicit synchronization rather than elapsed wall time.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `@effect/atom-solid/Hooks.useAtom`

- **Source:** `packages/atom/solid/src/Hooks.ts:209`
- **Kind / category:** `root-declaration` / `hooks`
- **Priority:** **recommended**
- **Current description:** Returns a Solid accessor for a writable atom together with a setter for updating it.
- **Signature hint:** `declare function useAtom<R, W, const Mode extends 'value' | 'promise' | 'promiseExit' = never>(atom: () => Atom.Writable<R, W>, options?: { readonly mode?: ([R] extends [AsyncResult.AsyncResult<any, any>] ? Mode : 'value') | undefined; }): readonly [value: Accessor<R>, write: 'promise' extends Mode ? ((value: W) => Promise<AsyncResult.AsyncResult.Success<R>>) : 'promiseExit' extends Mode ? ((value: W) => Promise<Exit.Exit<AsyncResult.AsyncResult.Success<R>, AsyncResult.AsyncResult.Failure<R>>>) : ((value: W | ((value: R) => W)) => void)]`
- **Import guidance:** Start from `import { useAtom } from "@effect/atom-solid"` and use `useAtom`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Returns a Solid accessor for a writable atom together with a setter for updating it. Call `useAtom` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Optional contrast:** Use `TestClock` or explicit synchronization rather than elapsed wall time.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

## Optional

### `@effect/atom-solid/Hooks.useAtomResource`

- **Source:** `packages/atom/solid/src/Hooks.ts:254`
- **Kind / category:** `root-declaration` / `hooks`
- **Priority:** **optional**
- **Current description:** Converts an `AsyncResult` atom into a Solid resource.
- **Signature hint:** `declare function useAtomResource<A, E>(atom: () => Atom.Atom<AsyncResult.AsyncResult<A, E>>, options?: ResourceOptions<A> & { readonly suspendOnWaiting?: boolean | undefined; }): ResourceReturn<A, void>`
- **Import guidance:** Start from `import { useAtomResource } from "@effect/atom-solid"` and use `useAtomResource`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Converts an `AsyncResult` atom into a Solid resource. Call `useAtomResource` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Optional contrast:** Use `TestClock` or explicit synchronization rather than elapsed wall time.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/atom-solid/Hooks.useAtomInitialValues`

- **Source:** `packages/atom/solid/src/Hooks.ts:39`
- **Kind / category:** `root-declaration` / `hooks`
- **Priority:** **optional**
- **Current description:** Seeds initial atom values in the current Solid atom registry.
- **Signature hint:** `declare function useAtomInitialValues(initialValues: Iterable<readonly [Atom.Atom<any>, any]>): void`
- **Import guidance:** Start from `import { useAtomInitialValues } from "@effect/atom-solid"` and use `useAtomInitialValues`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Seeds initial atom values in the current Solid atom registry. Call `useAtomInitialValues` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/atom-solid/Hooks.useAtomValue`

- **Source:** `packages/atom/solid/src/Hooks.ts:61`
- **Kind / category:** `root-declaration` / `hooks`
- **Priority:** **optional**
- **Current description:** Subscribes to an atom in the current Solid registry and returns its value as a Solid accessor.
- **Signature hint:** `declare function useAtomValue<A>(atom: () => Atom.Atom<A>): Accessor<A> declare function useAtomValue<A, B>(atom: () => Atom.Atom<A>, f: (_: A) => B): Accessor<B>`
- **Import guidance:** Start from `import { useAtomValue } from "@effect/atom-solid"` and use `useAtomValue`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Subscribes to an atom in the current Solid registry and returns its value as a Solid accessor. Call `useAtomValue` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/atom-solid/Hooks.useAtomMount`

- **Source:** `packages/atom/solid/src/Hooks.ts:142`
- **Kind / category:** `root-declaration` / `hooks`
- **Priority:** **optional**
- **Current description:** Mounts an atom in the current Solid registry for the lifetime of the current Solid computation.
- **Signature hint:** `declare function useAtomMount<A>(atom: () => Atom.Atom<A>): void`
- **Import guidance:** Start from `import { useAtomMount } from "@effect/atom-solid"` and use `useAtomMount`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Mounts an atom in the current Solid registry for the lifetime of the current Solid computation. Call `useAtomMount` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/atom-solid/Hooks.useAtomRefresh`

- **Source:** `packages/atom/solid/src/Hooks.ts:181`
- **Kind / category:** `root-declaration` / `hooks`
- **Priority:** **optional**
- **Current description:** Mounts an atom and returns a callback that refreshes the current atom.
- **Signature hint:** `declare function useAtomRefresh<A>(atom: () => Atom.Atom<A>): () => void`
- **Import guidance:** Start from `import { useAtomRefresh } from "@effect/atom-solid"` and use `useAtomRefresh`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Mounts an atom and returns a callback that refreshes the current atom. Call `useAtomRefresh` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/atom-solid/Hooks.useAtomSubscribe`

- **Source:** `packages/atom/solid/src/Hooks.ts:237`
- **Kind / category:** `root-declaration` / `hooks`
- **Priority:** **optional**
- **Current description:** Subscribes a callback to an atom in the current Solid registry.
- **Signature hint:** `declare function useAtomSubscribe<A>(atom: () => Atom.Atom<A>, f: (_: A) => void, options?: { readonly immediate?: boolean; }): void`
- **Import guidance:** Start from `import { useAtomSubscribe } from "@effect/atom-solid"` and use `useAtomSubscribe`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Subscribes a callback to an atom in the current Solid registry. Call `useAtomSubscribe` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/atom-solid/Hooks.useAtomRef`

- **Source:** `packages/atom/solid/src/Hooks.ts:294`
- **Kind / category:** `root-declaration` / `hooks`
- **Priority:** **optional**
- **Current description:** Subscribes to an atom ref and returns its value as a Solid accessor.
- **Signature hint:** `declare function useAtomRef<A>(ref: () => AtomRef.ReadonlyRef<A>): Accessor<A>`
- **Import guidance:** Start from `import { useAtomRef } from "@effect/atom-solid"` and use `useAtomRef`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Subscribes to an atom ref and returns its value as a Solid accessor. Call `useAtomRef` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/atom-solid/Hooks.useAtomRefProp`

- **Source:** `packages/atom/solid/src/Hooks.ts:328`
- **Kind / category:** `root-declaration` / `hooks`
- **Priority:** **optional**
- **Current description:** Returns a Solid accessor for a property ref derived from an atom ref.
- **Signature hint:** `declare function useAtomRefProp<A, K extends keyof A>(ref: () => AtomRef.AtomRef<A>, prop: K): Accessor<AtomRef.AtomRef<A[K]>>`
- **Import guidance:** Start from `import { useAtomRefProp } from "@effect/atom-solid"` and use `useAtomRefProp`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Returns a Solid accessor for a property ref derived from an atom ref. Call `useAtomRefProp` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/atom-solid/Hooks.useAtomRefPropValue`

- **Source:** `packages/atom/solid/src/Hooks.ts:358`
- **Kind / category:** `root-declaration` / `hooks`
- **Priority:** **optional**
- **Current description:** Returns a Solid accessor for the value of a property ref derived from an atom ref.
- **Signature hint:** `declare function useAtomRefPropValue<A, K extends keyof A>(ref: () => AtomRef.AtomRef<A>, prop: K): Accessor<A[K]>`
- **Import guidance:** Start from `import { useAtomRefPropValue } from "@effect/atom-solid"` and use `useAtomRefPropValue`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Returns a Solid accessor for the value of a property ref derived from an atom ref. Call `useAtomRefPropValue` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.
