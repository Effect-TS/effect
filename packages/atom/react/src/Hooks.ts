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
import * as Equal from "effect/Equal"
import * as Exit from "effect/Exit"
import * as AsyncResult from "effect/unstable/reactivity/AsyncResult"
import * as Atom from "effect/unstable/reactivity/Atom"
import type * as AtomRef from "effect/unstable/reactivity/AtomRef"
import * as AtomRegistry from "effect/unstable/reactivity/AtomRegistry"
import * as React from "react"
import { RegistryContext } from "./RegistryContext.ts"

interface AtomStore<A> {
  readonly subscribe: (f: () => void) => () => void
  readonly snapshot: () => A
  readonly getServerSnapshot: () => A
}

const storeRegistry = new WeakMap<AtomRegistry.AtomRegistry, WeakMap<Atom.Atom<any>, AtomStore<any>>>()

function makeStore<A>(registry: AtomRegistry.AtomRegistry, atom: Atom.Atom<A>): AtomStore<A> {
  let stores = storeRegistry.get(registry)
  if (stores === undefined) {
    stores = new WeakMap()
    storeRegistry.set(registry, stores)
  }
  const store = stores.get(atom)
  if (store !== undefined) {
    return store
  }
  const newStore: AtomStore<A> = {
    subscribe(f) {
      return registry.subscribe(atom, f)
    },
    snapshot() {
      return registry.get(atom)
    },
    getServerSnapshot() {
      return Atom.getServerValue(atom, registry)
    }
  }
  stores.set(atom, newStore)
  return newStore
}

function useStore<A>(registry: AtomRegistry.AtomRegistry, atom: Atom.Atom<A>): A {
  const store = makeStore(registry, atom)

  return React.useSyncExternalStore(store.subscribe, store.snapshot, store.getServerSnapshot)
}

interface SelectionInstance<A> {
  hasValue: boolean
  value: A
}

const identity = <A>(value: A): A => value

function useStoreWithSelector<A, B>(
  registry: AtomRegistry.AtomRegistry,
  atom: Atom.Atom<A>,
  select: (_: A) => B,
  equals: (previous: B, next: B) => boolean
): B {
  const store = makeStore(registry, atom)
  const instanceRef = React.useRef<SelectionInstance<B> | null>(null)
  if (instanceRef.current === null) {
    instanceRef.current = { hasValue: false, value: undefined as B }
  }
  const instance = instanceRef.current

  const [getSnapshot, getServerSnapshot] = React.useMemo(() => {
    let hasMemo = false
    let memoizedSnapshot: A
    let memoizedSelection: B

    const memoizedSelect = (snapshot: A): B => {
      if (!hasMemo) {
        const selection = select(snapshot)
        let selected = selection
        if (instance.hasValue && equals(instance.value, selection)) {
          selected = instance.value
        }
        hasMemo = true
        memoizedSnapshot = snapshot
        memoizedSelection = selected
        return selected
      }
      if (Object.is(memoizedSnapshot, snapshot)) {
        return memoizedSelection
      }
      const selection = select(snapshot)
      if (equals(memoizedSelection, selection)) {
        memoizedSnapshot = snapshot
        return memoizedSelection
      }
      memoizedSnapshot = snapshot
      memoizedSelection = selection
      return selection
    }

    return [
      () => memoizedSelect(store.snapshot()),
      () => memoizedSelect(store.getServerSnapshot())
    ] as const
  }, [store, select, equals, instance])

  const value = React.useSyncExternalStore(store.subscribe, getSnapshot, getServerSnapshot)
  React.useEffect(() => {
    instance.hasValue = true
    instance.value = value
  }, [instance, value])

  return value
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
 * When a selector is provided, the hook subscribes to its result. The component
 * re-renders only when the selected value changes according to `equals`, which
 * defaults to `Object.is`. Selectors do not need stable function identity.
 *
 * @see {@link useAtom} for reading and updating a writable atom from one component
 * @see {@link useAtomRef} for reading an `AtomRef` directly
 *
 * @category hooks
 * @since 4.0.0
 */
export const useAtomValue: {
  <A>(atom: Atom.Atom<A>): A
  <A, B>(atom: Atom.Atom<A>, select: (_: A) => B, equals?: (previous: B, next: B) => boolean): B
} = <A, B = A>(
  atom: Atom.Atom<A>,
  select?: (_: A) => B,
  equals?: (previous: B, next: B) => boolean
): B => {
  const registry = React.useContext(RegistryContext)
  return useStoreWithSelector(
    registry,
    atom,
    select ?? identity as (_: A) => B,
    equals ?? Object.is
  )
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
    useStore(registry, atom),
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

const selectAsyncResult = <A, E, B>(
  result: AsyncResult.AsyncResult<A, E>,
  select: (_: A) => B,
  includeFailure: boolean
): AsyncResult.AsyncResult<B, E> =>
  result._tag === "Failure" && !includeFailure
    ? result as unknown as AsyncResult.Failure<B, E>
    : AsyncResult.map(result, select)

function atomResultOrSuspendWithSelector<A, E, B>(
  registry: AtomRegistry.AtomRegistry,
  atom: Atom.Atom<AsyncResult.AsyncResult<A, E>>,
  suspendOnWaiting: boolean,
  select: ((_: A) => B) | undefined,
  equals: (previous: B, next: B) => boolean,
  includeFailure: boolean
) {
  const value = useStoreWithSelector(
    registry,
    atom,
    select === undefined
      ? identity as (_: AsyncResult.AsyncResult<A, E>) => AsyncResult.AsyncResult<B, E>
      : (result) => selectAsyncResult(result, select, includeFailure),
    select === undefined ? Object.is : selectedResultEquals(equals, includeFailure)
  )
  if (value._tag === "Initial" || (suspendOnWaiting && value.waiting)) {
    throw atomToPromise(registry, atom, suspendOnWaiting)
  }
  return value
}

const selectedResultEquals = <A, E>(
  equals: (previous: A, next: A) => boolean,
  includeFailure: boolean
): (previous: AsyncResult.AsyncResult<A, E>, next: AsyncResult.AsyncResult<A, E>) => boolean =>
(previous, next) => {
  if (previous === next) {
    return true
  }
  if (previous._tag !== next._tag || previous.waiting !== next.waiting) {
    return false
  }
  switch (previous._tag) {
    case "Initial":
      return true
    case "Success":
      return equals(previous.value, (next as AsyncResult.Success<A, E>).value)
    case "Failure": {
      const nextFailure = next as AsyncResult.Failure<A, E>
      if (!Equal.equals(previous.cause, nextFailure.cause)) {
        return false
      }
      if (!includeFailure) {
        return true
      }
      const previousSuccess = previous.previousSuccess
      const nextSuccess = nextFailure.previousSuccess
      if (previousSuccess._tag !== nextSuccess._tag) {
        return false
      }
      if (previousSuccess._tag === "None" || nextSuccess._tag === "None") {
        return true
      }
      return previousSuccess.value.waiting === nextSuccess.value.waiting &&
        equals(previousSuccess.value.value, nextSuccess.value.value)
    }
  }
}

/**
 * Reads an `AsyncResult` atom through React Suspense, suspending while the
 * result is initial or configured as waiting, and optionally selects from the
 * successful value.
 *
 * **When to use**
 *
 * Use when a React component should render only after an `AsyncResult` atom has
 * left its initial state, with loading delegated to a Suspense boundary.
 *
 * **Details**
 *
 * `suspendOnWaiting` defaults to `false`. When `includeFailure` is `true`, a
 * failure result is returned instead of being thrown. When `select` is
 * provided, the hook subscribes to the selected success value and uses
 * `equals`, defaulting to `Object.is`, to avoid unrelated re-renders. Changes
 * to the result variant, waiting state, or failure cause are not hidden by
 * selection equality.
 *
 * **Gotchas**
 *
 * Without `includeFailure`, failure results are thrown with
 * `Cause.squash(result.cause)`, so callers need an error boundary for failures.
 * When selected Success values compare equal, the previous selected Success,
 * including its timestamp, is retained.
 *
 * @see {@link useAtomValue} for reading the raw `AsyncResult` value without Suspense
 *
 * @category hooks
 * @since 4.0.0
 */
export const useAtomSuspense: {
  <A, E, B, const IncludeFailure extends boolean = false>(
    atom: Atom.Atom<AsyncResult.AsyncResult<A, E>>,
    options: {
      readonly select: (_: A) => B
      readonly equals?: ((previous: B, next: B) => boolean) | undefined
      readonly suspendOnWaiting?: boolean | undefined
      readonly includeFailure?: IncludeFailure | undefined
    }
  ): AsyncResult.Success<B, E> | (IncludeFailure extends true ? AsyncResult.Failure<B, E> : never)
  <A, E, const IncludeFailure extends boolean = false>(
    atom: Atom.Atom<AsyncResult.AsyncResult<A, E>>,
    options?: {
      readonly select?: undefined
      readonly equals?: undefined
      readonly suspendOnWaiting?: boolean | undefined
      readonly includeFailure?: IncludeFailure | undefined
    }
  ): AsyncResult.Success<A, E> | (IncludeFailure extends true ? AsyncResult.Failure<A, E> : never)
} = <A, E, B = A, const IncludeFailure extends boolean = false>(
  atom: Atom.Atom<AsyncResult.AsyncResult<A, E>>,
  options?: {
    readonly select?: ((_: A) => B) | undefined
    readonly equals?: ((previous: B, next: B) => boolean) | undefined
    readonly suspendOnWaiting?: boolean | undefined
    readonly includeFailure?: IncludeFailure | undefined
  }
): AsyncResult.Success<B, E> | (IncludeFailure extends true ? AsyncResult.Failure<B, E> : never) => {
  const registry = React.useContext(RegistryContext)
  const suspendOnWaiting = options?.suspendOnWaiting ?? false
  const includeFailure = options?.includeFailure === true
  const result = atomResultOrSuspendWithSelector(
    registry,
    atom,
    suspendOnWaiting,
    options?.select,
    options?.equals ?? Object.is,
    includeFailure
  )
  if (result._tag === "Failure" && !includeFailure) {
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
  const [, setValue] = React.useState(ref.value)
  React.useEffect(() => ref.subscribe(setValue), [ref])
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
