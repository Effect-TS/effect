# Example Suggestions: `@effect/atom-react/Hooks`

- **Package:** `@effect/atom-react`
- **Source:** `packages/atom/react/src/Hooks.ts`
- **Uncovered API records:** 11
- **Priorities:** 0 required, 3 recommended, 8 optional, 0 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                             | Line | Kind               | Priority        |
| ----------------------------------------------- | ---: | ------------------ | --------------- |
| `@effect/atom-react/Hooks.useAtomSet`           |  209 | `root-declaration` | **recommended** |
| `@effect/atom-react/Hooks.useAtom`              |  273 | `root-declaration` | **recommended** |
| `@effect/atom-react/Hooks.useAtomSuspense`      |  371 | `root-declaration` | **recommended** |
| `@effect/atom-react/Hooks.useAtomInitialValues` |   78 | `root-declaration` | **optional**    |
| `@effect/atom-react/Hooks.useAtomValue`         |  113 | `root-declaration` | **optional**    |
| `@effect/atom-react/Hooks.useAtomMount`         |  185 | `root-declaration` | **optional**    |
| `@effect/atom-react/Hooks.useAtomRefresh`       |  250 | `root-declaration` | **optional**    |
| `@effect/atom-react/Hooks.useAtomSubscribe`     |  406 | `root-declaration` | **optional**    |
| `@effect/atom-react/Hooks.useAtomRef`           |  437 | `root-declaration` | **optional**    |
| `@effect/atom-react/Hooks.useAtomRefProp`       |  462 | `root-declaration` | **optional**    |
| `@effect/atom-react/Hooks.useAtomRefPropValue`  |  486 | `root-declaration` | **optional**    |

## Recommended

### `@effect/atom-react/Hooks.useAtomSet`

- **Source:** `packages/atom/react/src/Hooks.ts:209`
- **Kind / category:** `root-declaration` / `hooks`
- **Priority:** **recommended**
- **Current description:** Mounts a writable atom and returns a setter without subscribing to its value.
- **Signature hint:** `declare function useAtomSet<R, W, Mode extends 'value' | 'promise' | 'promiseExit' = never>(atom: Atom.Writable<R, W>, options?: { readonly mode?: ([R] extends [AsyncResult.AsyncResult<any, any>] ? Mode : 'value') | undefined; }): 'promise' extends Mode ? ((value: W) => Promise<AsyncResult.AsyncResult.Success<R>>) : 'promiseExit' extends Mode ? ((value: W) => Promise<Exit.Exit<AsyncResult.AsyncResult.Success<R>, AsyncResult.AsyncResult.Failure<R>>>) : ((value: W | ((value: R) => W)) => void)`
- **Import guidance:** Start from `import { useAtomSet } from "@effect/atom-react"` and use `useAtomSet`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Mounts a writable atom and returns a setter without subscribing to its value. Call `useAtomSet` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Optional contrast:** Use `TestClock` or explicit synchronization rather than elapsed wall time.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `@effect/atom-react/Hooks.useAtom`

- **Source:** `packages/atom/react/src/Hooks.ts:273`
- **Kind / category:** `root-declaration` / `hooks`
- **Priority:** **recommended**
- **Current description:** Subscribes to a writable atom and returns its current value together with a setter for updating it.
- **Signature hint:** `declare function useAtom<R, W, const Mode extends 'value' | 'promise' | 'promiseExit' = never>(atom: Atom.Writable<R, W>, options?: { readonly mode?: ([R] extends [AsyncResult.AsyncResult<any, any>] ? Mode : 'value') | undefined; }): readonly [value: R, write: 'promise' extends Mode ? ((value: W) => Promise<AsyncResult.AsyncResult.Success<R>>) : 'promiseExit' extends Mode ? ((value: W) => Promise<Exit.Exit<AsyncResult.AsyncResult.Success<R>, AsyncResult.AsyncResult.Failure<R>>>) : ((value: W | ((value: R) => W)) => void)]`
- **Import guidance:** Start from `import { useAtom } from "@effect/atom-react"` and use `useAtom`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Subscribes to a writable atom and returns its current value together with a setter for updating it. Call `useAtom` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Optional contrast:** Use `TestClock` or explicit synchronization rather than elapsed wall time.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `@effect/atom-react/Hooks.useAtomSuspense`

- **Source:** `packages/atom/react/src/Hooks.ts:371`
- **Kind / category:** `root-declaration` / `hooks`
- **Priority:** **recommended**
- **Current description:** Reads an `AsyncResult` atom through React Suspense, suspending while the result is initial or configured as waiting.
- **Signature hint:** `declare function useAtomSuspense<A, E, const IncludeFailure extends boolean = false>(atom: Atom.Atom<AsyncResult.AsyncResult<A, E>>, options?: { readonly suspendOnWaiting?: boolean | undefined; readonly includeFailure?: IncludeFailure | undefined; }): AsyncResult.Success<A, E> | (IncludeFailure extends true ? AsyncResult.Failure<A, E> : never)`
- **Import guidance:** Start from `import { useAtomSuspense } from "@effect/atom-react"` and use `useAtomSuspense`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Reads an `AsyncResult` atom through React Suspense, suspending while the result is initial or configured as waiting. Call `useAtomSuspense` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Optional contrast:** Use `TestClock` or explicit synchronization rather than elapsed wall time.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

## Optional

### `@effect/atom-react/Hooks.useAtomInitialValues`

- **Source:** `packages/atom/react/src/Hooks.ts:78`
- **Kind / category:** `root-declaration` / `hooks`
- **Priority:** **optional**
- **Current description:** Seeds initial atom values in the current React atom registry.
- **Signature hint:** `declare function useAtomInitialValues(initialValues: Iterable<readonly [Atom.Atom<any>, any]>): void`
- **Import guidance:** Start from `import { useAtomInitialValues } from "@effect/atom-react"` and use `useAtomInitialValues`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Seeds initial atom values in the current React atom registry. Call `useAtomInitialValues` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/atom-react/Hooks.useAtomValue`

- **Source:** `packages/atom/react/src/Hooks.ts:113`
- **Kind / category:** `root-declaration` / `hooks`
- **Priority:** **optional**
- **Current description:** Subscribes to an atom in the current React registry and returns its current value, optionally mapped through a selector.
- **Signature hint:** `declare function useAtomValue<A>(atom: Atom.Atom<A>): A declare function useAtomValue<A, B>(atom: Atom.Atom<A>, f: (_: A) => B): B`
- **Import guidance:** Start from `import { useAtomValue } from "@effect/atom-react"` and use `useAtomValue`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Subscribes to an atom in the current React registry and returns its current value, optionally mapped through a selector. Call `useAtomValue` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/atom-react/Hooks.useAtomMount`

- **Source:** `packages/atom/react/src/Hooks.ts:185`
- **Kind / category:** `root-declaration` / `hooks`
- **Priority:** **optional**
- **Current description:** Mounts an atom in the current React registry for the lifetime of the component.
- **Signature hint:** `declare function useAtomMount<A>(atom: Atom.Atom<A>): void`
- **Import guidance:** Start from `import { useAtomMount } from "@effect/atom-react"` and use `useAtomMount`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Mounts an atom in the current React registry for the lifetime of the component. Call `useAtomMount` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/atom-react/Hooks.useAtomRefresh`

- **Source:** `packages/atom/react/src/Hooks.ts:250`
- **Kind / category:** `root-declaration` / `hooks`
- **Priority:** **optional**
- **Current description:** Mounts an atom and returns a callback that refreshes it in the current React registry.
- **Signature hint:** `declare function useAtomRefresh<A>(atom: Atom.Atom<A>): () => void`
- **Import guidance:** Start from `import { useAtomRefresh } from "@effect/atom-react"` and use `useAtomRefresh`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Mounts an atom and returns a callback that refreshes it in the current React registry. Call `useAtomRefresh` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/atom-react/Hooks.useAtomSubscribe`

- **Source:** `packages/atom/react/src/Hooks.ts:406`
- **Kind / category:** `root-declaration` / `hooks`
- **Priority:** **optional**
- **Current description:** Subscribes a callback to an atom in the current React registry for the component lifetime.
- **Signature hint:** `declare function useAtomSubscribe<A>(atom: Atom.Atom<A>, f: (_: A) => void, options?: { readonly immediate?: boolean; }): void`
- **Import guidance:** Start from `import { useAtomSubscribe } from "@effect/atom-react"` and use `useAtomSubscribe`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Subscribes a callback to an atom in the current React registry for the component lifetime. Call `useAtomSubscribe` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/atom-react/Hooks.useAtomRef`

- **Source:** `packages/atom/react/src/Hooks.ts:437`
- **Kind / category:** `root-declaration` / `hooks`
- **Priority:** **optional**
- **Current description:** Subscribes to an atom ref and returns its latest value.
- **Signature hint:** `declare function useAtomRef<A>(ref: AtomRef.ReadonlyRef<A>): A`
- **Import guidance:** Start from `import { useAtomRef } from "@effect/atom-react"` and use `useAtomRef`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Subscribes to an atom ref and returns its latest value. Call `useAtomRef` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/atom-react/Hooks.useAtomRefProp`

- **Source:** `packages/atom/react/src/Hooks.ts:462`
- **Kind / category:** `root-declaration` / `hooks`
- **Priority:** **optional**
- **Current description:** Returns a memoized atom ref for a property of another atom ref.
- **Signature hint:** `declare function useAtomRefProp<A, K extends keyof A>(ref: AtomRef.AtomRef<A>, prop: K): AtomRef.AtomRef<A[K]>`
- **Import guidance:** Start from `import { useAtomRefProp } from "@effect/atom-react"` and use `useAtomRefProp`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Returns a memoized atom ref for a property of another atom ref. Call `useAtomRefProp` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/atom-react/Hooks.useAtomRefPropValue`

- **Source:** `packages/atom/react/src/Hooks.ts:486`
- **Kind / category:** `root-declaration` / `hooks`
- **Priority:** **optional**
- **Current description:** Subscribes to a property ref derived from an atom ref and returns its current value.
- **Signature hint:** `declare function useAtomRefPropValue<A, K extends keyof A>(ref: AtomRef.AtomRef<A>, prop: K): A[K]`
- **Import guidance:** Start from `import { useAtomRefPropValue } from "@effect/atom-react"` and use `useAtomRefPropValue`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Subscribes to a property ref derived from an atom ref and returns its current value. Call `useAtomRefPropValue` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.
