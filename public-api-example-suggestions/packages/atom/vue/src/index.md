# Example Suggestions: `@effect/atom-vue`

- **Package:** `@effect/atom-vue`
- **Source:** `packages/atom/vue/src/index.ts`
- **Uncovered API records:** 7
- **Priorities:** 0 required, 2 recommended, 5 optional, 0 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                | Line | Kind               | Priority        |
| ---------------------------------- | ---: | ------------------ | --------------- |
| `@effect/atom-vue.registryKey`     |   53 | `unmodeled-export` | **recommended** |
| `@effect/atom-vue.useAtom`         |   85 | `unmodeled-export` | **recommended** |
| `@effect/atom-vue.defaultRegistry` |   59 | `unmodeled-export` | **optional**    |
| `@effect/atom-vue.injectRegistry`  |   65 | `unmodeled-export` | **optional**    |
| `@effect/atom-vue.useAtomValue`    |  108 | `unmodeled-export` | **optional**    |
| `@effect/atom-vue.useAtomSet`      |  162 | `unmodeled-export` | **optional**    |
| `@effect/atom-vue.useAtomRef`      |  201 | `unmodeled-export` | **optional**    |

## Recommended

### `@effect/atom-vue.registryKey`

- **Source:** `packages/atom/vue/src/index.ts:53`
- **Kind / category:** `unmodeled-export` / `registry`
- **Priority:** **recommended** This API is absent from the compliant JSDoc model, so repair its documentation shape before implementing an example.
- **Current description:** No compliant JSDoc description is currently available.
- **Signature hint:** `export const registryKey = Symbol.for("@effect/atom-vue/registryKey") as InjectionKey<AtomRegistry.AtomRegistry>`
- **Import guidance:** Start from `import { registryKey } from "@effect/atom-vue"` and use `registryKey`.
- **Suggested snippet:** Use `registryKey` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Future-agent advice:** Add compliant prose, `@category`, and `@since` before any snippet. Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `@effect/atom-vue.useAtom`

- **Source:** `packages/atom/vue/src/index.ts:85`
- **Kind / category:** `unmodeled-export` / `composables`
- **Priority:** **recommended** This API is absent from the compliant JSDoc model, so repair its documentation shape before implementing an example.
- **Current description:** No compliant JSDoc description is currently available.
- **Signature hint:** `export const useAtom = <R, W, Mode extends "value" | "promise" | "promiseExit" = never>( atom: () => Atom.Writable<R, W>, options?: { readonly mode?: ([R] extends [AsyncResult.AsyncResult<any, any>] ? Mode : "value") | undefined } ): readonly [ Readonly<Ref<R>>, write: "promise" extends Mode ? ( (value: W) => Promise<AsyncResult.AsyncResult.Success<R>> ) : "promiseExit" extends Mode ? ( (value: W) => Promise<Exit.Exit<AsyncResult.AsyncResult.Success<R>, AsyncResult.AsyncResult.Failure<R>>> ) : (`
- **Import guidance:** Start from `import { useAtom } from "@effect/atom-vue"` and use `useAtom`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: No compliant JSDoc description is currently available. Call `useAtom` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Optional contrast:** Use `TestClock` or explicit synchronization rather than elapsed wall time.
- **Future-agent advice:** Add compliant prose, `@category`, and `@since` before any snippet. Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

## Optional

### `@effect/atom-vue.defaultRegistry`

- **Source:** `packages/atom/vue/src/index.ts:59`
- **Kind / category:** `unmodeled-export` / `registry`
- **Priority:** **optional** This API is absent from the compliant JSDoc model, so repair its documentation shape before implementing an example.
- **Current description:** No compliant JSDoc description is currently available.
- **Signature hint:** `export const defaultRegistry: AtomRegistry.AtomRegistry = AtomRegistry.make()`
- **Import guidance:** Start from `import { defaultRegistry } from "@effect/atom-vue"` and use `defaultRegistry`.
- **Suggested snippet:** Use `defaultRegistry` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Future-agent advice:** Add compliant prose, `@category`, and `@since` before any snippet. Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/atom-vue.injectRegistry`

- **Source:** `packages/atom/vue/src/index.ts:65`
- **Kind / category:** `unmodeled-export` / `registry`
- **Priority:** **optional** This API is absent from the compliant JSDoc model, so repair its documentation shape before implementing an example.
- **Current description:** No compliant JSDoc description is currently available.
- **Signature hint:** `export const injectRegistry = (): AtomRegistry.AtomRegistry => { return inject(registryKey, defaultRegistry) }`
- **Import guidance:** Start from `import { injectRegistry } from "@effect/atom-vue"` and use `injectRegistry`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: No compliant JSDoc description is currently available. Call `injectRegistry` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Future-agent advice:** Add compliant prose, `@category`, and `@since` before any snippet. Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/atom-vue.useAtomValue`

- **Source:** `packages/atom/vue/src/index.ts:108`
- **Kind / category:** `unmodeled-export` / `composables`
- **Priority:** **optional** This API is absent from the compliant JSDoc model, so repair its documentation shape before implementing an example.
- **Current description:** No compliant JSDoc description is currently available.
- **Signature hint:** `export const useAtomValue = <A>(atom: () => Atom.Atom<A>): Readonly<Ref<A>> => useAtomValueRef(atom)[0]`
- **Import guidance:** Start from `import { useAtomValue } from "@effect/atom-vue"` and use `useAtomValue`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: No compliant JSDoc description is currently available. Call `useAtomValue` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Future-agent advice:** Add compliant prose, `@category`, and `@since` before any snippet. Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/atom-vue.useAtomSet`

- **Source:** `packages/atom/vue/src/index.ts:162`
- **Kind / category:** `unmodeled-export` / `composables`
- **Priority:** **optional** This API is absent from the compliant JSDoc model, so repair its documentation shape before implementing an example.
- **Current description:** No compliant JSDoc description is currently available.
- **Signature hint:** `export const useAtomSet = < R, W, Mode extends "value" | "promise" | "promiseExit" = never >( atom: () => Atom.Writable<R, W>, options?: { readonly mode?: ([R] extends [AsyncResult.AsyncResult<any, any>] ? Mode : "value") | undefined } ): "promise" extends Mode ? ( ( value: W, options?: { readonly signal?: AbortSignal | undefined } | undefined ) => Promise<AsyncResult.AsyncResult.Success<R>> ) : "promiseExit" extends Mode ? ( ( value: W, options?: { readonly signal?: AbortSignal | undefined } |`
- **Import guidance:** Start from `import { useAtomSet } from "@effect/atom-vue"` and use `useAtomSet`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: No compliant JSDoc description is currently available. Call `useAtomSet` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Optional contrast:** Use `TestClock` or explicit synchronization rather than elapsed wall time.
- **Future-agent advice:** Add compliant prose, `@category`, and `@since` before any snippet. Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/atom-vue.useAtomRef`

- **Source:** `packages/atom/vue/src/index.ts:201`
- **Kind / category:** `unmodeled-export` / `composables`
- **Priority:** **optional** This API is absent from the compliant JSDoc model, so repair its documentation shape before implementing an example.
- **Current description:** No compliant JSDoc description is currently available.
- **Signature hint:** `export const useAtomRef = <A>(atomRef: () => AtomRef.ReadonlyRef<A>): Readonly<Ref<A>> => { const atomRefRef = computed(atomRef) const value = shallowRef<A>(atomRefRef.value.value) watchEffect((onCleanup) => { const ref = atomRefRef.value onCleanup(ref.subscribe((next: A) => { value.value = next })) }) return value as Readonly<Ref<A>> }`
- **Import guidance:** Start from `import { useAtomRef } from "@effect/atom-vue"` and use `useAtomRef`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: No compliant JSDoc description is currently available. Call `useAtomRef` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Future-agent advice:** Add compliant prose, `@category`, and `@since` before any snippet. Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.
