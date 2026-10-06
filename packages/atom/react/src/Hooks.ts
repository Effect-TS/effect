/**
 * React hooks for working with Effect atoms from components. The hooks read,
 * write, mount, refresh, and subscribe to atoms from `RegistryContext`, handle
 * `AsyncResult` atoms with React Suspense, and expose helpers for reading and
 * deriving `AtomRef` values.
 *
 * @since 4.0.0
 */
"use client"

import * as Cause from "effect/Cause"
import * as Effect from "effect/Effect"
import * as Exit from "effect/Exit"
import type * as AsyncResult from "effect/reactivity/AsyncResult"
import * as Atom from "effect/reactivity/Atom"
import type * as AtomRef from "effect/reactivity/AtomRef"
import * as AtomRegistry from "effect/reactivity/AtomRegistry"
import * as React from "react"
import { RegistryContext } from "./RegistryContext.ts"

interface AtomStore<A> {
  readonly subscribe: (f: () => void) => () => void
  readonly snapshot: () => A
  readonly getServerSnapshot: () => A
}

interface LockableStore<A> extends AtomStore<A> {
  /** Keeps `getServerSnapshot` returning the same value until released. */
  readonly lock: () => () => void
}

const storeRegistry = new WeakMap<AtomRegistry.AtomRegistry, WeakMap<Atom.Atom<any>, AtomStore<any>>>()

function getStore<S extends AtomStore<any>>(
  registry: AtomRegistry.AtomRegistry,
  atom: Atom.Atom<any>,
  make: () => S
): S {
  let stores = storeRegistry.get(registry)
  if (stores === undefined) {
    stores = new WeakMap()
    storeRegistry.set(registry, stores)
  }
  let store = stores.get(atom)
  if (store === undefined) {
    store = make()
    stores.set(atom, store)
  }
  return store as S
}

function makeStore<A>(registry: AtomRegistry.AtomRegistry, atom: Atom.Atom<A>): LockableStore<A> {
  return getStore(registry, atom, () => {
    // A Suspense boundary can hydrate long after the rest of the page. While a
    // hydrated reader is subscribed, keep serving the value it hydrated with so
    // later boundaries match the server HTML even if the atom has changed;
    // React then re-renders them with the live value. The server never
    // subscribes, so server renders always read the registry.
    //
    // An atom that changes before its first reader hydrates still mismatches:
    // nothing has locked a snapshot yet, and the server's value is unknown.
    let serverSnapshot: { readonly value: A } | undefined
    let locks = 0
    const store: LockableStore<A> = {
      subscribe(f) {
        const unlock = store.lock()
        const unsubscribe = registry.subscribe(atom, f)
        return () => {
          unsubscribe()
          unlock()
        }
      },
      snapshot: () => registry.get(atom),
      getServerSnapshot() {
        if (locks === 0 || serverSnapshot === undefined) {
          serverSnapshot = { value: Atom.getServerValue(atom, registry) }
        }
        return serverSnapshot.value
      },
      lock() {
        locks++
        return () => {
          locks--
        }
      }
    }
    return store
  })
}

// `useAtomValue(source, f)` maps the atom per component, so a late reader's
// mapped atom has no hydrated snapshot of its own. Derive it from the source
// atom's snapshot instead, and lock the source while the reader is subscribed.
function makeSelectorStore<A, B>(
  registry: AtomRegistry.AtomRegistry,
  atom: Atom.Atom<B>,
  source: Atom.Atom<A>,
  f: (_: A) => B
): AtomStore<B> {
  return getStore(registry, atom, () => {
    const sourceStore = makeStore(registry, source)
    const hasServerValue = Atom.ServerValueTypeId in source
    let mapped: { readonly source: A; readonly value: B } | undefined
    return {
      subscribe(f) {
        const unlock = sourceStore.lock()
        const unsubscribe = registry.subscribe(atom, f)
        return () => {
          unsubscribe()
          unlock()
        }
      },
      snapshot: () => registry.get(atom),
      getServerSnapshot() {
        const sourceValue = sourceStore.getServerSnapshot()
        // While the source snapshot is live, the registry already holds the
        // mapped value; reusing it keeps the identity React compares against.
        if (!hasServerValue && Object.is(sourceValue, registry.get(source))) {
          return registry.get(atom)
        }
        if (mapped === undefined || !Object.is(mapped.source, sourceValue)) {
          mapped = { source: sourceValue, value: f(sourceValue) }
        }
        return mapped.value
      }
    }
  })
}

function useStore<A>(store: AtomStore<A>): A {
  return React.useSyncExternalStore(store.subscribe, store.snapshot, store.getServerSnapshot)
}

const initialValuesSet = new WeakMap<AtomRegistry.AtomRegistry, WeakSet<Atom.Atom<any>>>()

/**
 * Seeds initial atom values in the current React atom registry.
 *
 * **When to use**
 *
 * Use to seed atom values from a React component after the current registry
 * already exists.
 *
 * **Gotchas**
 *
 * Each atom is initialized at most once for a given registry by this hook, so
 * later calls for the same atom in that registry are ignored.
 *
 * @category hooks
 * @since 4.0.0
 */
export const useAtomInitialValues = (initialValues: Iterable<readonly [Atom.Atom<any>, any]>): void => {
  const registry = React.useContext(RegistryContext)
  let set = initialValuesSet.get(registry)
  if (set === undefined) {
    set = new WeakSet()
    initialValuesSet.set(registry, set)
  }
  for (const [atom, value] of initialValues) {
    if (!set.has(atom)) {
      set.add(atom)
      ;(registry as any).ensureNode(atom).setValue(value)
    }
  }
}

/**
 * Subscribes to an atom in the current React registry and returns its current
 * value, optionally mapped through a selector.
 *
 * **When to use**
 *
 * Use when a React component needs to render from an atom value without also
 * returning a setter.
 *
 * **Details**
 *
 * When a selector is provided, the hook maps the atom before subscribing so the
 * component reads the selected value from the current `RegistryContext`.
 *
 * **Gotchas**
 *
 * During hydration, readers in a Suspense boundary that hydrates later use the
 * value that earlier readers of the same atom hydrated with, then update to the
 * live value. This only holds while at least one of those earlier readers stays
 * mounted. Once the last one unmounts, later boundaries read the live value
 * again.
 *
 * The client value can still differ from the server HTML, and React reports a
 * hydration mismatch, if the atom changes before any reader of it has
 * hydrated, if it changes and every earlier reader unmounts before a later
 * boundary hydrates, or if a derived atom is first read inside a later
 * boundary.
 *
 * @see {@link useAtom} for reading and updating a writable atom from one component
 * @see {@link useAtomRef} for reading an `AtomRef` directly
 *
 * @category hooks
 * @since 4.0.0
 */
export const useAtomValue: {
  <A>(atom: Atom.Atom<A>): A
  <A, B>(atom: Atom.Atom<A>, f: (_: A) => B): B
} = <A>(atom: Atom.Atom<A>, f?: (_: A) => A): A => {
  const registry = React.useContext(RegistryContext)
  if (f) {
    const atomB = React.useMemo(() => Atom.map(atom, f), [atom, f])
    return useStore(makeSelectorStore(registry, atomB, atom, f))
  }
  return useStore(makeStore(registry, atom))
}

function mountAtom<A>(registry: AtomRegistry.AtomRegistry, atom: Atom.Atom<A>): void {
  React.useEffect(() => registry.mount(atom), [atom, registry])
}

function setAtom<R, W, Mode extends "value" | "promise" | "promiseExit" = never>(
  registry: AtomRegistry.AtomRegistry,
  atom: Atom.Writable<R, W>,
  options?: {
    readonly mode?: ([R] extends [AsyncResult.AsyncResult<any, any>] ? Mode : "value") | undefined
  }
): "promise" extends Mode ? (
    (value: W) => Promise<AsyncResult.AsyncResult.Success<R>>
  ) :
  "promiseExit" extends Mode ? (
      (value: W) => Promise<Exit.Exit<AsyncResult.AsyncResult.Success<R>, AsyncResult.AsyncResult.Failure<R>>>
    ) :
  ((value: W | ((value: R) => W)) => void)
{
  if (options?.mode === "promise" || options?.mode === "promiseExit") {
    return React.useCallback((value: W) => {
      registry.set(atom, value)
      const promise = Effect.runPromiseExit(
        AtomRegistry.getResult(registry, atom as Atom.Atom<AsyncResult.AsyncResult<any, any>>, {
          suspendOnWaiting: true
        })
      )
      return options!.mode === "promise" ? promise.then(flattenExit) : promise
    }, [registry, atom, options.mode]) as any
  }
  return React.useCallback((value: W | ((value: R) => W)) => {
    registry.set(atom, typeof value === "function" ? (value as any)(registry.get(atom)) : value)
  }, [registry, atom]) as any
}

const flattenExit = <A, E>(exit: Exit.Exit<A, E>): A => {
  if (Exit.isSuccess(exit)) return exit.value
  throw Cause.squash(exit.cause)
}

/**
 * Mounts an atom in the current React registry for the lifetime of the
 * component.
 *
 * **When to use**
 *
 * Use to keep an atom mounted from a React component without reading, writing,
 * or refreshing it.
 *
 * **Details**
 *
 * The hook uses the current `RegistryContext` and releases the mount through
 * React effect cleanup when the component unmounts or when the registry or atom
 * dependency changes.
 *
 * @see {@link useAtomSet} for mounting a writable atom while returning a setter
 * @see {@link useAtomRefresh} for mounting an atom while returning a refresh callback
 *
 * @category hooks
 * @since 4.0.0
 */
export const useAtomMount = <A>(atom: Atom.Atom<A>): void => {
  const registry = React.useContext(RegistryContext)
  mountAtom(registry, atom)
}

/**
 * Mounts a writable atom and returns a setter without subscribing to its value.
 *
 * **When to use**
 *
 * Use when a React component needs to update a writable atom without rendering
 * from that atom's value.
 *
 * **Details**
 *
 * The hook mounts the atom and returns a setter. In value mode the setter
 * accepts a write value or updater function; for `AsyncResult` atoms, `promise`
 * and `promiseExit` modes return a promise for the success value or full `Exit`.
 *
 * @see {@link useAtom} for reading and updating the same writable atom
 *
 * @category hooks
 * @since 4.0.0
 */
export const useAtomSet = <
  R,
  W,
  Mode extends "value" | "promise" | "promiseExit" = never
>(
  atom: Atom.Writable<R, W>,
  options?: {
    readonly mode?: ([R] extends [AsyncResult.AsyncResult<any, any>] ? Mode : "value") | undefined
  }
): "promise" extends Mode ? (
    (value: W) => Promise<AsyncResult.AsyncResult.Success<R>>
  ) :
  "promiseExit" extends Mode ? (
      (value: W) => Promise<Exit.Exit<AsyncResult.AsyncResult.Success<R>, AsyncResult.AsyncResult.Failure<R>>>
    ) :
  ((value: W | ((value: R) => W)) => void) =>
{
  const registry = React.useContext(RegistryContext)
  mountAtom(registry, atom)
  return setAtom(registry, atom, options)
}

/**
 * Mounts an atom and returns a callback that refreshes it in the current React
 * registry.
 *
 * **When to use**
 *
 * Use to expose a React callback that requests a refresh for an atom without
 * reading or writing its value.
 *
 * **Details**
 *
 * The hook uses the current `RegistryContext`, mounts the atom for the
 * component lifetime, and returns a callback that calls `registry.refresh`.
 *
 * @see {@link useAtomMount} for mounting an atom without returning a refresh callback
 *
 * @category hooks
 * @since 4.0.0
 */
export const useAtomRefresh = <A>(atom: Atom.Atom<A>): () => void => {
  const registry = React.useContext(RegistryContext)
  mountAtom(registry, atom)
  return React.useCallback(() => {
    registry.refresh(atom)
  }, [registry, atom])
}

/**
 * Subscribes to a writable atom and returns its current value together with a
 * setter for updating it.
 *
 * **When to use**
 *
 * Use when a React component needs both to render the current value of a
 * writable atom and update it from the same component.
 *
 * @see {@link useAtomValue} for subscribing to an atom without a setter
 * @see {@link useAtomSet} for updating a writable atom without subscribing to its value
 *
 * @category hooks
 * @since 4.0.0
 */
export const useAtom = <R, W, const Mode extends "value" | "promise" | "promiseExit" = never>(
  atom: Atom.Writable<R, W>,
  options?: {
    readonly mode?: ([R] extends [AsyncResult.AsyncResult<any, any>] ? Mode : "value") | undefined
  }
): readonly [
  value: R,
  write: "promise" extends Mode ? (
      (value: W) => Promise<AsyncResult.AsyncResult.Success<R>>
    ) :
    "promiseExit" extends Mode ? (
        (value: W) => Promise<Exit.Exit<AsyncResult.AsyncResult.Success<R>, AsyncResult.AsyncResult.Failure<R>>>
      ) :
    ((value: W | ((value: R) => W)) => void)
] => {
  const registry = React.useContext(RegistryContext)
  return [
    useStore(makeStore(registry, atom)),
    setAtom(registry, atom, options)
  ] as const
}

const atomPromiseMap = {
  suspendOnWaiting: new WeakMap<
    AtomRegistry.AtomRegistry,
    WeakMap<Atom.Atom<any>, Promise<void>>
  >(),
  default: new WeakMap<
    AtomRegistry.AtomRegistry,
    WeakMap<Atom.Atom<any>, Promise<void>>
  >()
}

function atomToPromise<A, E>(
  registry: AtomRegistry.AtomRegistry,
  atom: Atom.Atom<AsyncResult.AsyncResult<A, E>>,
  suspendOnWaiting: boolean
) {
  const registries = suspendOnWaiting ? atomPromiseMap.suspendOnWaiting : atomPromiseMap.default
  let map = registries.get(registry)
  if (map === undefined) {
    map = new WeakMap()
    registries.set(registry, map)
  }
  let promise = map.get(atom)
  if (promise !== undefined) {
    return promise
  }
  promise = new Promise<void>((resolve) => {
    const dispose = registry.subscribe(atom, (result) => {
      if (result._tag === "Initial" || (suspendOnWaiting && result.waiting)) {
        return
      }
      setTimeout(dispose, 1000)
      resolve()
      map.delete(atom)
    })
  })
  map.set(atom, promise)
  return promise
}

function atomResultOrSuspend<A, E>(
  registry: AtomRegistry.AtomRegistry,
  atom: Atom.Atom<AsyncResult.AsyncResult<A, E>>,
  suspendOnWaiting: boolean
) {
  const value = useStore(makeStore(registry, atom))
  if (value._tag === "Initial" || (suspendOnWaiting && value.waiting)) {
    throw atomToPromise(registry, atom, suspendOnWaiting)
  }
  return value
}

/**
 * Reads an `AsyncResult` atom through React Suspense, suspending while the
 * result is initial or configured as waiting.
 *
 * **When to use**
 *
 * Use when a React component should render only after an `AsyncResult` atom has
 * left its initial state, with loading delegated to a Suspense boundary.
 *
 * **Details**
 *
 * `suspendOnWaiting` defaults to `false`. When `includeFailure` is `true`, a
 * failure result is returned instead of being thrown.
 *
 * **Gotchas**
 *
 * Without `includeFailure`, failure results are thrown with
 * `Cause.squash(result.cause)`, so callers need an error boundary for failures.
 *
 * @see {@link useAtomValue} for reading the raw `AsyncResult` value without Suspense
 *
 * @category hooks
 * @since 4.0.0
 */
export const useAtomSuspense = <A, E, const IncludeFailure extends boolean = false>(
  atom: Atom.Atom<AsyncResult.AsyncResult<A, E>>,
  options?: {
    readonly suspendOnWaiting?: boolean | undefined
    readonly includeFailure?: IncludeFailure | undefined
  }
): AsyncResult.Success<A, E> | (IncludeFailure extends true ? AsyncResult.Failure<A, E> : never) => {
  const registry = React.useContext(RegistryContext)
  const result = atomResultOrSuspend(registry, atom, options?.suspendOnWaiting ?? false)
  if (result._tag === "Failure" && !options?.includeFailure) {
    throw Cause.squash(result.cause)
  }
  return result as any
}

/**
 * Subscribes a callback to an atom in the current React registry for the
 * component lifetime.
 *
 * **When to use**
 *
 * Use when a React component needs to run a callback for atom changes without
 * reading the atom value during render.
 *
 * **Details**
 *
 * The subscription is installed in a React effect and cleaned up on unmount or
 * dependency change. When `options.immediate` is enabled, the callback receives
 * the current value when the effect subscribes.
 *
 * @see {@link useAtomValue} for reading an atom value during render instead of running a callback
 *
 * @category hooks
 * @since 4.0.0
 */
export const useAtomSubscribe = <A>(
  atom: Atom.Atom<A>,
  f: (_: A) => void,
  options?: { readonly immediate?: boolean }
): void => {
  const registry = React.useContext(RegistryContext)
  React.useEffect(
    () => registry.subscribe(atom, f, options),
    [registry, atom, f, options?.immediate]
  )
}

/**
 * Subscribes to an atom ref and returns its latest value.
 *
 * **When to use**
 *
 * Use when a React component should render from an `AtomRef.ReadonlyRef`
 * directly instead of reading an atom through the current registry.
 *
 * **Details**
 *
 * The hook subscribes with `ref.subscribe`, triggers re-renders through React
 * state, and returns the current `ref.value`.
 *
 * @see {@link useAtomValue} for reading an `Atom` from the current registry
 * @see {@link useAtomRefPropValue} for reading a property ref value
 *
 * @category hooks
 * @since 4.0.0
 */
export const useAtomRef = <A>(ref: AtomRef.ReadonlyRef<A>): A => {
  const [, forceUpdate] = React.useReducer((n) => n + 1, 0)
  React.useEffect(() => ref.subscribe(forceUpdate), [ref])
  return ref.value
}

/**
 * Returns a memoized atom ref for a property of another atom ref.
 *
 * **When to use**
 *
 * Use to derive an `AtomRef` for one property of an object-shaped atom ref.
 *
 * **Details**
 *
 * The hook memoizes `ref.prop(prop)` for the `[ref, prop]` dependency pair and
 * returns the property ref so callers can read, set, update, or subscribe to
 * that nested property.
 *
 * @see {@link useAtomRef} for subscribing to an atom ref value
 * @see {@link useAtomRefPropValue} for subscribing directly to a property value
 *
 * @category hooks
 * @since 4.0.0
 */
export const useAtomRefProp = <A, K extends keyof A>(ref: AtomRef.AtomRef<A>, prop: K): AtomRef.AtomRef<A[K]> =>
  React.useMemo(() => ref.prop(prop), [ref, prop])

/**
 * Subscribes to a property ref derived from an atom ref and returns its current
 * value.
 *
 * **When to use**
 *
 * Use when a React component needs only the current value of one property from
 * an object-shaped `AtomRef`.
 *
 * **Details**
 *
 * The hook composes `useAtomRefProp(ref, prop)` with `useAtomRef`, so the
 * property ref is memoized for the `[ref, prop]` pair and then subscribed
 * through `ref.subscribe`.
 *
 * @see {@link useAtomRefProp} for returning the property ref directly
 * @see {@link useAtomRef} for subscribing to a whole atom ref value
 *
 * @category hooks
 * @since 4.0.0
 */
export const useAtomRefPropValue = <A, K extends keyof A>(ref: AtomRef.AtomRef<A>, prop: K): A[K] =>
  useAtomRef(useAtomRefProp(ref, prop))
