/**
 * Solid hooks for using Effect Atoms from components and computations. The
 * hooks read and write atoms through the current `RegistryContext`, mount atoms
 * for cleanup, subscribe callbacks, seed initial values, expose `AsyncResult`
 * atoms as Solid resources, and read values from `AtomRef` references.
 *
 * @stability unstable
 * @since 4.0.0
 */
import * as Cause from "effect/Cause"
import * as Effect from "effect/Effect"
import * as Exit from "effect/Exit"
import * as AsyncResult from "effect/reactivity/AsyncResult"
import * as Atom from "effect/reactivity/Atom"
import type * as AtomRef from "effect/reactivity/AtomRef"
import * as AtomRegistry from "effect/reactivity/AtomRegistry"
import type { Accessor } from "solid-js"
import * as Solid from "solid-js"
import { createEffect, createMemo, createSignal, onCleanup, untrack, useContext } from "solid-js"
import { isSolid2 } from "./internal/solid.ts"
import { RegistryContext } from "./RegistryContext.ts"

const initialValuesSet = new WeakMap<AtomRegistry.AtomRegistry, WeakSet<Atom.Atom<any>>>()

/**
 * Seeds initial atom values in the current Solid atom registry.
 *
 * **When to use**
 *
 * Use to seed atom values from a Solid component after the current registry
 * already exists.
 *
 * **Details**
 *
 * For each atom in the current registry, this hook applies the first value
 * supplied through the hook. Later calls for the same atom in that registry are
 * ignored.
 *
 * @stability unstable
 * @category hooks
 * @since 4.0.0
 */
export const useAtomInitialValues = (initialValues: Iterable<readonly [Atom.Atom<any>, any]>): void => {
  const registry = useContext(RegistryContext)
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
 * Subscribes to an atom in the current Solid registry and returns its value as
 * a Solid accessor.
 *
 * @stability unstable
 * @category hooks
 * @since 4.0.0
 */
export const useAtomValue: {
  <A>(atom: () => Atom.Atom<A>): Accessor<A>
  <A, B>(atom: () => Atom.Atom<A>, f: (_: A) => B): Accessor<B>
} = <A>(atom: () => Atom.Atom<A>, f?: (_: A) => A): Accessor<A> => {
  const registry = useContext(RegistryContext)
  return createAtomAccessor(registry, f ? () => Atom.map(atom(), f) : atom)
}

function createAtomAccessor<A>(registry: AtomRegistry.AtomRegistry, atom: () => Atom.Atom<A>): Accessor<A> {
  return createSubscriptionAccessor(
    atom,
    (atom, f) => registry.subscribe(atom, f),
    (atom) => registry.get(atom)
  )
}

// Solid 2 removed `createComputed`; an eager memo runs the subscription with
// the same owner lifecycle in both major versions. Values are boxed because
// Solid 2 treats a function passed to `createSignal` as a derived signal.
function createSubscriptionAccessor<S, A>(
  source: () => S,
  subscribe: (source: S, f: (value: A) => void) => () => void,
  get: (source: S) => A
): Accessor<A> {
  const current = createMemo(() => {
    const s = source()
    const box = { set: undefined as ((value: { readonly value: A }) => void) | undefined }
    onCleanup(subscribe(s, (value) => box.set!({ value })))
    const [value, setValue] = createSignal({ value: get(s) }, constSignalOptions)
    box.set = setValue
    return value
  })
  return () => current()().value
}

// `ownedWrite` lets Solid 2 accept registry notifications that arrive while a
// computation is running; Solid 1 ignores it.
const constSignalOptions = { equals: false, ownedWrite: true } as const

function mountAtom<A>(registry: AtomRegistry.AtomRegistry, atom: () => Atom.Atom<A>): void {
  createMemo(() => {
    onCleanup(registry.mount(atom()))
  })
}

function setAtom<R, W, Mode extends "value" | "promise" | "promiseExit" = never>(
  registry: AtomRegistry.AtomRegistry,
  atom: () => Atom.Writable<R, W>,
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
  const memo = createCurrentAtom(atom)
  if (options?.mode === "promise" || options?.mode === "promiseExit") {
    return ((value: W) => {
      registry.set(memo(), value)
      const promise = Effect.runPromiseExit(
        AtomRegistry.getResult(registry, memo() as Atom.Atom<AsyncResult.AsyncResult<any, any>>, {
          suspendOnWaiting: true
        })
      )
      return options!.mode === "promise" ? promise.then(flattenExit) : promise
    }) as any
  }
  return ((value: W | ((value: R) => W)) => {
    registry.set(memo(), typeof value === "function" ? (value as any)(registry.get(memo())) : value)
  }) as any
}

// Callbacks read the current atom without subscribing their caller, so Solid 2
// does not warn when they run inside an effect.
function createCurrentAtom<A>(atom: () => A): () => A {
  const current = createMemo(atom)
  return () => untrack(current)
}

const flattenExit = <A, E>(exit: Exit.Exit<A, E>): A => {
  if (Exit.isSuccess(exit)) return exit.value
  throw Cause.squash(exit.cause)
}

/**
 * Mounts an atom in the current Solid registry for the lifetime of the current
 * Solid computation.
 *
 * **When to use**
 *
 * Use to keep an atom mounted from a Solid owner without reading, writing, or
 * refreshing it.
 *
 * **Details**
 *
 * The hook uses the current `RegistryContext`, mounts inside a Solid
 * computation, and releases the mount through Solid cleanup when the
 * computation changes or the owner is disposed.
 *
 * @see {@link useAtomSet} for mounting a writable atom while returning a setter
 * @see {@link useAtomRefresh} for mounting an atom while returning a refresh callback
 *
 * @stability unstable
 * @category hooks
 * @since 4.0.0
 */
export const useAtomMount = <A>(atom: () => Atom.Atom<A>): void => {
  const registry = useContext(RegistryContext)
  mountAtom(registry, atom)
}

/**
 * Returns a setter for a writable atom without subscribing to its value.
 *
 * **Gotchas**
 *
 * In `promise` and `promiseExit` modes, the setter observes the atom's next
 * settled result, not a result correlated with that write. Overlapping writes
 * can resolve with another write's result. Serialize writes when each caller
 * needs its own result.
 *
 * @stability unstable
 * @category hooks
 * @since 4.0.0
 */
export const useAtomSet = <
  R,
  W,
  Mode extends "value" | "promise" | "promiseExit" = never
>(
  atom: () => Atom.Writable<R, W>,
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
  const registry = useContext(RegistryContext)
  mountAtom(registry, atom)
  return setAtom(registry, atom, options)
}

/**
 * Mounts an atom and returns a callback that refreshes the current atom.
 *
 * @stability unstable
 * @category hooks
 * @since 4.0.0
 */
export const useAtomRefresh = <A>(atom: () => Atom.Atom<A>): () => void => {
  const registry = useContext(RegistryContext)
  mountAtom(registry, atom)
  const memo = createCurrentAtom(atom)
  return () => registry.refresh(memo())
}

/**
 * Returns a Solid accessor for a writable atom together with a setter for
 * updating it.
 *
 * **When to use**
 *
 * Use when a Solid component or computation needs both a reactive accessor for
 * a writable atom and a write function for that same atom.
 *
 * **Details**
 *
 * The setter accepts either a write value or an updater function. For
 * `AsyncResult` atoms, `promise` and `promiseExit` modes return promises for the
 * success value or full `Exit`.
 *
 * **Gotchas**
 *
 * In `promise` and `promiseExit` modes, the setter observes the atom's next
 * settled result, not a result correlated with that write. Overlapping writes
 * can resolve with another write's result. Serialize writes when each caller
 * needs its own result.
 *
 * @see {@link useAtomValue} for subscribing to an atom without a setter
 * @see {@link useAtomSet} for updating a writable atom without subscribing to its value
 *
 * @stability unstable
 * @category hooks
 * @since 4.0.0
 */
export const useAtom = <R, W, const Mode extends "value" | "promise" | "promiseExit" = never>(
  atom: () => Atom.Writable<R, W>,
  options?: {
    readonly mode?: ([R] extends [AsyncResult.AsyncResult<any, any>] ? Mode : "value") | undefined
  }
): readonly [
  value: Accessor<R>,
  write: "promise" extends Mode ? (
      (value: W) => Promise<AsyncResult.AsyncResult.Success<R>>
    ) :
    "promiseExit" extends Mode ? (
        (value: W) => Promise<Exit.Exit<AsyncResult.AsyncResult.Success<R>, AsyncResult.AsyncResult.Failure<R>>>
      ) :
    ((value: W | ((value: R) => W)) => void)
] => {
  const registry = useContext(RegistryContext)
  return [
    createAtomAccessor(registry, atom),
    setAtom(registry, atom, options)
  ] as const
}

/**
 * Subscribes a callback to an atom in the current Solid registry.
 *
 * @stability unstable
 * @category hooks
 * @since 4.0.0
 */
export const useAtomSubscribe = <A>(
  atom: () => Atom.Atom<A>,
  f: (_: A) => void,
  options?: { readonly immediate?: boolean }
): void => {
  const registry = useContext(RegistryContext)
  if (isSolid2) {
    // Solid 2 effects split tracking (compute) from side effects (apply); the
    // apply phase returns its cleanup.
    ;(createEffect as any)(atom, (atom: Atom.Atom<A>) => registry.subscribe(atom, f, options))
    return
  }
  createEffect(() => {
    onCleanup(registry.subscribe(atom(), f, options))
  })
}

/**
 * Converts an `AsyncResult` atom into a Solid resource.
 *
 * **Gotchas**
 *
 * Requires Solid 1. Solid 2 removed `createResource`, so on Solid 2 this hook
 * throws and its return type is `never`. Read the `AsyncResult` with
 * {@link useAtomValue} instead. Vite builds against Solid 2 report
 * `IMPORT_IS_UNDEFINED` for `createResource`; the warning is expected and the
 * unused code is removed from the bundle.
 *
 * @stability unstable
 * @category hooks
 * @since 4.0.0
 */
export const useAtomResource = <A, E>(
  atom: () => Atom.Atom<AsyncResult.AsyncResult<A, E>>,
  options?: ResourceOptions<A> & {
    readonly suspendOnWaiting?: boolean | undefined
  }
): ResourceReturn<A> => {
  if (createResource === undefined) {
    throw new Error(
      "useAtomResource requires Solid 1 because Solid 2 removed createResource. Read the AsyncResult with useAtomValue instead."
    )
  }
  const result = useAtomValue(atom)
  return createResource(result, (result) => {
    if (AsyncResult.isInitial(result) || (options?.suspendOnWaiting && result.waiting)) {
      return constUnresolvedPromise
    } else if (AsyncResult.isSuccess(result)) {
      return Promise.resolve(result.value)
    }
    return Promise.reject(Cause.squash(result.cause))
  })
}

const constUnresolvedPromise = new Promise<never>(() => {})

// Read through the namespace so the module still links against Solid 2, where
// `createResource` no longer exists.
const createResource = (Solid as Partial<typeof Solid>).createResource

// The published declarations must type-check against Solid 1 and 2, but
// `ResourceOptions` and `ResourceReturn` only exist in Solid 1. Instantiating
// the consumer's `createResource` (source, fetcher, options) overload yields
// exactly `ResourceOptions<A>` and `ResourceReturn<A, void>` on Solid 1, and
// `never` on Solid 2, where `useAtomResource` throws.
declare const solidCreateResource: typeof Solid extends { readonly createResource: infer F } ? F
  : <T, S, R>(source: unknown, fetcher: unknown, options?: never) => never
type CreateResource<A> = typeof solidCreateResource<A, unknown, void>
type ResourceOptions<A> = NonNullable<Parameters<CreateResource<A>>[2]>
type ResourceReturn<A> = ReturnType<CreateResource<A>>

/**
 * Subscribes to an atom ref and returns its value as a Solid accessor.
 *
 * **When to use**
 *
 * Use when a Solid component or computation should render from an
 * `AtomRef.ReadonlyRef` directly instead of reading an atom through the current
 * registry.
 *
 * **Details**
 *
 * The hook accepts a thunk for the ref, reads `ref().value`, subscribes with
 * `ref.subscribe`, and releases the subscription through Solid cleanup when
 * the selected ref changes or the owner is disposed.
 *
 * @see {@link useAtomValue} for reading an `Atom` from the current registry
 * @see {@link useAtomRefPropValue} for reading a property ref value
 *
 * @stability unstable
 * @category hooks
 * @since 4.0.0
 */
export const useAtomRef = <A>(ref: () => AtomRef.ReadonlyRef<A>): Accessor<A> =>
  createSubscriptionAccessor(ref, (ref, f) => ref.subscribe(f), (ref) => ref.value)

/**
 * Returns a Solid accessor for a property ref derived from an atom ref.
 *
 * **When to use**
 *
 * Use to derive an `AtomRef` for one property of an object-shaped atom ref in a
 * Solid computation.
 *
 * **Details**
 *
 * The returned accessor memoizes `ref().prop(prop)`, updating when the source
 * ref thunk produces a different ref.
 *
 * **Gotchas**
 *
 * The `prop` argument is captured as a plain value. Recreate the hook call when
 * the property key should change.
 *
 * @see {@link useAtomRef} for subscribing to an atom ref value
 * @see {@link useAtomRefPropValue} for subscribing directly to a property value
 *
 * @stability unstable
 * @category hooks
 * @since 4.0.0
 */
export const useAtomRefProp = <A, K extends keyof A>(
  ref: () => AtomRef.AtomRef<A>,
  prop: K
): Accessor<AtomRef.AtomRef<A[K]>> => createMemo(() => ref().prop(prop))

/**
 * Returns a Solid accessor for the value of a property ref derived from an atom
 * ref.
 *
 * **When to use**
 *
 * Use when a Solid component or computation needs the value of one property
 * from an object-shaped `AtomRef` without keeping the intermediate property ref.
 *
 * **Details**
 *
 * The hook composes `useAtomRefProp(ref, prop)` with `useAtomRef`, returning a
 * Solid accessor for the selected property value.
 *
 * **Gotchas**
 *
 * The `prop` argument is captured as a plain value. Recreate the hook call when
 * the property key should change.
 *
 * @see {@link useAtomRef} for subscribing to a whole atom ref value
 * @see {@link useAtomRefProp} for returning the property ref directly
 *
 * @stability unstable
 * @category hooks
 * @since 4.0.0
 */
export const useAtomRefPropValue = <A, K extends keyof A>(ref: () => AtomRef.AtomRef<A>, prop: K): Accessor<A[K]> =>
  useAtomRef(useAtomRefProp(ref, prop))
