/**
 * Angular injection functions for using Effect Atoms from components,
 * directives, and services. They read atoms and refs as Angular signals, derive
 * projections inside the atom graph, mount and refresh atoms, subscribe
 * callbacks, write atoms synchronously or awaitably, and build a store that
 * bundles all of that for a single atom.
 *
 * Every function whose name starts with `inject` must be called from an
 * injection context, such as a field initializer or a constructor, and every
 * subscription and keepalive it creates is released when the surrounding
 * injector is destroyed. What those functions return does not carry that
 * restriction: the registry and the destroy hook are captured at creation time,
 * so the setters, the refresh callbacks, the store's methods, and
 * `atomMatchResult` stay callable afterwards.
 *
 * @since 4.0.0
 */
import type { Signal } from "@angular/core"
import { DestroyRef, inject, signal } from "@angular/core"
import * as Cause from "effect/Cause"
import * as Effect from "effect/Effect"
import * as Equal from "effect/Equal"
import * as Exit from "effect/Exit"
import * as AsyncResult from "effect/unstable/reactivity/AsyncResult"
import * as Atom from "effect/unstable/reactivity/Atom"
import type * as AtomRef from "effect/unstable/reactivity/AtomRef"
import * as AtomRegistry from "effect/unstable/reactivity/AtomRegistry"

import { ATOM_RESULT_STATUS } from "./Constants.ts"
import { injectAtomRegistry } from "./Providers.ts"
import type {
  AtomComputedOptions,
  AtomExit,
  AtomRegistryOptions,
  AtomResultView,
  AtomResultViewOptions,
  AtomStore,
  AtomSubscribeOptions,
  AtomSuccess,
  AtomValue,
  AtomWriteValue,
  ReadableAtomStore
} from "./Types.ts"

const flattenExit = <A, E>(exit: Exit.Exit<A, E>): A => {
  if (Exit.isSuccess(exit)) return exit.value
  throw Cause.squash(exit.cause)
}

// A private registry is owned here, and therefore disposed with the injector
const injectScopedRegistry = (options?: AtomRegistryOptions): AtomRegistry.AtomRegistry => {
  if (options?.registry === undefined) return injectAtomRegistry()

  const registry = AtomRegistry.make(options.registry)
  injectDestroyRef().onDestroy(() => registry.dispose())
  return registry
}

// The single bridge from the atom graph to Angular's reactivity
const atomSignal = <A>(
  registry: AtomRegistry.AtomRegistry,
  destroyRef: DestroyRef,
  atom: Atom.Atom<A>,
  options?: AtomComputedOptions<A>
): Signal<A> => {
  const out = signal(registry.get(atom), options)

  destroyRef.onDestroy(registry.subscribe(atom, (next) => out.set(next)))

  return out.asReadonly()
}

const setExit = <R, W>(
  registry: AtomRegistry.AtomRegistry,
  atom: Atom.Writable<R, W>,
  value: W
): Promise<Exit.Exit<unknown, unknown>> => {
  registry.set(atom, value)

  // Free to check: `getResult` is about to read the value anyway
  const current: unknown = registry.get(atom)
  if (!AsyncResult.isAsyncResult(current)) {
    throw new Error(
      "[@effect/atom-angular] setExit/setPromise require a Result-shaped atom; " +
        "this atom is not Result-shaped"
    )
  }

  return Effect.runPromiseExit(
    AtomRegistry.getResult(registry, atom as unknown as Atom.Atom<AsyncResult.AsyncResult<any, any>>, {
      suspendOnWaiting: true
    })
  )
}

// `exactOptionalPropertyTypes` leaves a typed caller two choices per transform:
// omit it, or pass a function. This is for the untyped one.
const requireTransform = (name: string, f: unknown): void => {
  if (f !== undefined && typeof f !== "function") {
    throw new TypeError(`[@effect/atom-angular] ${name} must be a function`)
  }
}

// Checked in the match rather than once up front, because that is where the
// value first exists
const requireResult = <R extends AsyncResult.AsyncResult<any, any>>(value: R): R => {
  if (!AsyncResult.isAsyncResult(value)) {
    throw new TypeError(
      "[@effect/atom-angular] matchResult requires a Result-shaped atom; " +
        "this atom is not Result-shaped"
    )
  }

  return value
}

// The branches are disjoint, so comparing `value` and `error` unconditionally is
// safe: whichever is not the branch's own field is `null` on both sides
const sameResultView = (
  a: AtomResultView<unknown, unknown>,
  b: AtomResultView<unknown, unknown>
): boolean =>
  a.status === b.status &&
  a.waiting === b.waiting &&
  Equal.equals(a.value, b.value) &&
  Equal.equals(a.error, b.error)

/**
 * Returns the `DestroyRef` of the current Angular injector.
 *
 * **When to use**
 *
 * Use to tie a subscription or a keepalive created outside these functions to
 * the same lifetime they use.
 *
 * **Gotchas**
 *
 * Must be called from an injection context, such as a constructor or a field
 * initializer.
 *
 * @category injection
 * @since 4.0.0
 */
export const injectDestroyRef = (): DestroyRef => inject(DestroyRef)

/**
 * Subscribes to an atom and exposes its value as an Angular signal.
 *
 * **When to use**
 *
 * Use when a template or a computation should re-render as an atom changes.
 *
 * **Details**
 *
 * The signal is seeded with the atom's current value before the subscription is
 * created, so it already holds a value the first time it is read. Reading it
 * also mounts the atom for the injector's lifetime.
 *
 * **Gotchas**
 *
 * Must be called from an injection context; the subscription is torn down when
 * that injector is destroyed. The signal notifies on reference inequality, so
 * reach for {@link injectAtomComputed} and its comparator when a projection
 * rebuilds its value on every run.
 *
 * @see {@link injectAtomComputed} for deriving a projection instead of the whole value
 * @see {@link injectMakeAtom} for reading and writing the same atom through one store
 *
 * @category injection
 * @since 4.0.0
 */
export const injectAtomValue = <A>(atom: Atom.Atom<A>): Signal<A> =>
  atomSignal(injectAtomRegistry(), injectDestroyRef(), atom)

/**
 * Subscribes to an `AtomRef` and exposes its value as an Angular signal.
 *
 * **When to use**
 *
 * Use to render a reactive reference that is not part of the atom graph, such as
 * one handed out by a service.
 *
 * **Details**
 *
 * Refs live outside the registry, so this takes no atom and touches no registry
 * node. `ReadonlyRef.map` returns another `ReadonlyRef` and `AtomRef.prop`
 * returns a nested `AtomRef`; either can be passed here, and each notifies only
 * when its own view changes.
 *
 * **Gotchas**
 *
 * Must be called from an injection context; the subscription is torn down when
 * that injector is destroyed.
 *
 * @see {@link injectAtomValue} for reading an `Atom` from the registry
 *
 * @category injection
 * @since 4.0.0
 */
export const injectAtomRef = <A>(ref: AtomRef.ReadonlyRef<A>): Signal<A> => {
  const out = signal(ref.value)

  injectDestroyRef().onDestroy(ref.subscribe((next) => out.set(next)))

  return out.asReadonly()
}

/**
 * Subscribes to a projection of an atom and exposes it as an Angular signal.
 *
 * **When to use**
 *
 * Use when a component needs only part of an atom's value and should not
 * re-render when the rest of it changes.
 *
 * **Details**
 *
 * The projection is derived inside the atom graph with `Atom.map`, not over the
 * value signal, so the intermediate value is never subscribed to and the derived
 * node is shared with anything else in the registry that reads it.
 *
 * **Gotchas**
 *
 * Each call builds a new derived atom, so this is meant to be called once from
 * an injection context and stored, not called from a template expression.
 * Without `equal`, a transform that returns a fresh object or array notifies on
 * every recompute, because Angular compares with `Object.is`.
 *
 * @see {@link AtomComputedOptions} for the comparator this accepts
 * @see {@link injectAtomValue} for reading the whole value
 *
 * @category injection
 * @since 4.0.0
 */
export const injectAtomComputed = <A, B>(
  atom: Atom.Atom<A>,
  transform: (current: A) => B,
  options?: AtomComputedOptions<B>
): Signal<B> =>
  atomSignal(
    injectAtomRegistry(),
    injectDestroyRef(),
    // Left to infer, `Atom.map` binds its first type parameter to the argument
    // type and rejects the widened source
    Atom.map<Atom.Atom<A>, B>(atom, transform),
    options
  )

/**
 * Mounts an atom for the lifetime of the current Angular injector.
 *
 * **When to use**
 *
 * Use to keep an atom alive without reading, writing, or refreshing it, for
 * example to start a subscription-backed atom while a route is active.
 *
 * **Details**
 *
 * A mounted atom holds its state and keeps recomputing instead of being swept
 * when it goes idle. The keepalive is released when the injector is destroyed.
 *
 * **Gotchas**
 *
 * Must be called from an injection context. Reading the atom with
 * {@link injectAtomValue} mounts it as well, so both are rarely needed.
 *
 * @category injection
 * @since 4.0.0
 */
export const injectAtomMount = <A>(atom: Atom.Atom<A>): void => {
  injectDestroyRef().onDestroy(injectAtomRegistry().mount(atom))
}

/**
 * Observes an atom with a callback, without materialising a signal for it.
 *
 * **When to use**
 *
 * Use to run a side effect on every atom change, such as logging a value or
 * persisting it.
 *
 * **Details**
 *
 * The subscription runs until the current injector is destroyed. It does not
 * fire with the current value unless `immediate` is set in the options.
 *
 * **Gotchas**
 *
 * Must be called from an injection context, and there is no unsubscribe handle.
 * Use the registry's own `subscribe` for a subscription that must end earlier
 * than the injector.
 *
 * @see {@link AtomSubscribeOptions} for the options this accepts
 * @see {@link injectAtomValue} for observing the atom as a signal instead
 *
 * @category injection
 * @since 4.0.0
 */
export const injectAtomSubscribe = <A>(
  atom: Atom.Atom<A>,
  f: (value: A) => void,
  options?: AtomSubscribeOptions
): void => {
  injectDestroyRef().onDestroy(injectAtomRegistry().subscribe(atom, f, options))
}

/**
 * Returns a callback that re-runs an atom's read.
 *
 * **When to use**
 *
 * Use to reload an atom on demand, for example behind a refresh button.
 *
 * **Details**
 *
 * The registry is resolved once, at injection time, so the returned callback
 * stays usable from an event handler outside any injection context.
 *
 * **Gotchas**
 *
 * Must be called from an injection context. Refreshing discards whatever a write
 * had put in the atom, so a state atom is re-seeded with its initial value. The
 * atom is not mounted here, so pair this with {@link injectAtomValue} or
 * {@link injectAtomMount} to keep the refreshed value alive.
 *
 * @see {@link injectAtomValue} for reading the refreshed value
 *
 * @category injection
 * @since 4.0.0
 */
export const injectAtomRefresh = <A>(atom: Atom.Atom<A>): () => void => {
  const registry = injectAtomRegistry()
  return () => registry.refresh(atom)
}

/**
 * Returns a function that writes a value to a writable atom.
 *
 * **When to use**
 *
 * Use when a component only needs to update an atom, for example from an event
 * handler, and should not re-render when the atom changes.
 *
 * **Details**
 *
 * The registry is resolved once, at injection time, so the returned function
 * stays usable outside any injection context.
 *
 * **Gotchas**
 *
 * Must be called from an injection context. The atom is not mounted here, so a
 * write to an otherwise unread atom may be swept once it goes idle.
 *
 * @see {@link injectAtomUpdate} for writing a value derived from the current one
 *
 * @category injection
 * @since 4.0.0
 */
export const injectAtomSet = <R, W>(atom: Atom.Writable<R, W>): (value: W) => void => {
  const registry = injectAtomRegistry()
  return (value) => registry.set(atom, value)
}

/**
 * Returns a function that writes a value derived from the atom's current one.
 *
 * **When to use**
 *
 * Use to write increments, toggles, and anything else that must read the
 * current value before it writes.
 *
 * **Details**
 *
 * The transform runs inside the registry's `update`, so the read and the write
 * happen in a single registry pass rather than as a separate get and set.
 *
 * **Gotchas**
 *
 * Must be called from an injection context.
 *
 * @see {@link injectAtomSet} for writing a value directly
 *
 * @category injection
 * @since 4.0.0
 */
export const injectAtomUpdate = <R, W>(
  atom: Atom.Writable<R, W>
): (transform: (current: R) => W) => void => {
  const registry = injectAtomRegistry()
  return (transform) => registry.update(atom, transform)
}

/**
 * Returns a function that writes a `Result`-shaped atom and resolves with the
 * `Exit` of the run that write started.
 *
 * **When to use**
 *
 * Use when the caller must branch on the typed error of a mutation, for example
 * to map a validation failure onto form controls.
 *
 * **Details**
 *
 * The promise settles on the first `Success` or `Failure` that is not itself
 * waiting on another run, so an intermediate waiting state does not resolve it.
 *
 * **Gotchas**
 *
 * Must be called from an injection context. The `Result` constraint is
 * bypassable through the `any` in the atom's type parameters, so the value is
 * re-read after the write and a non-`Result` atom throws with a named error
 * instead of hanging forever.
 *
 * @see {@link injectAtomSetPromise} for the variant that rejects with the squashed cause
 * @see {@link AtomExit} for the type this resolves with
 *
 * @category injection
 * @since 4.0.0
 */
export const injectAtomSetExit = <R extends AsyncResult.AsyncResult<any, any>, W>(
  atom: Atom.Writable<R, W>
): (value: W) => Promise<AtomExit<R>> => {
  const registry = injectAtomRegistry()
  return (value) => setExit(registry, atom, value) as Promise<AtomExit<R>>
}

/**
 * Returns a function that writes a `Result`-shaped atom and resolves with the
 * success value of the run that write started.
 *
 * **When to use**
 *
 * Use when a mutation should read like an ordinary promise, for example to await
 * it in a component method and let a global handler deal with failures.
 *
 * **Gotchas**
 *
 * Must be called from an injection context. Rejects with the cause squashed by
 * `Cause.squash`, which loses the typed error channel; use
 * {@link injectAtomSetExit} to keep it.
 *
 * @see {@link injectAtomSetExit} for the variant that keeps the typed error
 *
 * @category injection
 * @since 4.0.0
 */
export const injectAtomSetPromise = <R extends AsyncResult.AsyncResult<any, any>, W>(
  atom: Atom.Writable<R, W>
): (value: W) => Promise<AtomSuccess<R>> => {
  const setter = injectAtomSetExit(atom)
  return (value) => setter(value).then(flattenExit)
}

/**
 * Flattens a `Result`-shaped store into one template-ready signal.
 *
 * **When to use**
 *
 * Use to render loading, success, and failure from a query atom in a single
 * template switch over `status`, instead of reading the `Result` tags directly.
 *
 * **Details**
 *
 * `S` and `F` are inferred from the transforms when they are given, and fall
 * back to the atom's own success type and a `Cause.pretty` string when they are
 * not, so an untransformed call stays fully typed instead of collapsing to
 * `unknown`. The name is unprefixed because it injects nothing: the store
 * already captured its registry and destroy hook, so this is callable wherever
 * the store is. `store.matchResult()` reaches the same view through the store.
 *
 * **Gotchas**
 *
 * The default comparator holds when `status` and `waiting` match and `value` and
 * `error` are equal under `Equal.equals` — structural for plain objects and
 * arrays as well as for Effect data types, and cached per object pair, so a
 * payload mutated in place after its first comparison can stop notifying. The
 * transforms are validated once, when the view is bound, and a non-function
 * throws rather than being silently dropped. The `Result` constraint is
 * bypassable, so the value is re-checked on every emission and a non-`Result`
 * store throws when the view is first read.
 *
 * @see {@link AtomResultViewOptions} for the transforms and the comparator
 * @see {@link AtomResultView} for the shape this produces
 *
 * @category combinators
 * @since 4.0.0
 */
export const atomMatchResult = <R extends AsyncResult.AsyncResult<any, any>, S = AtomSuccess<R>, F = string>(
  source: ReadableAtomStore<R>,
  { equal = sameResultView, transformFailure, transformSuccess }: AtomResultViewOptions<R, S, F> = {}
): Signal<AtomResultView<S, F>> => {
  requireTransform("transformSuccess", transformSuccess)
  requireTransform("transformFailure", transformFailure)
  requireTransform("equal", equal)

  return source.computed<AtomResultView<S, F>>(
    (result) =>
      AsyncResult.match(requireResult(result), {
        onInitial: ({ waiting }) => ({
          status: ATOM_RESULT_STATUS.INITIAL,
          waiting,
          value: null,
          error: null
        }),
        onFailure: ({ cause, waiting }) => ({
          status: ATOM_RESULT_STATUS.FAILURE,
          waiting,
          value: null,
          // Only the caller's transform can produce an `F`, and the fallback is
          // a string by construction. Same shape on the success side.
          error: (transformFailure ? transformFailure(cause) : Cause.pretty(cause)) as F
        }),
        onSuccess: ({ value, waiting }) => ({
          status: ATOM_RESULT_STATUS.SUCCESS,
          waiting,
          error: null,
          value: (transformSuccess ? transformSuccess(value) : value) as S
        })
      }),
    { equal }
  )
}

/**
 * Binds an atom to the current Angular injector and returns a store over it.
 *
 * **When to use**
 *
 * Use when one component or service needs several operations on the same atom —
 * read, write, derive, refresh — and a separate injection function for each
 * would be repetitive.
 *
 * **Details**
 *
 * The returned surface is selected from the atom's type: reads for every atom,
 * writes for writable ones, `matchResult` for `Result`-shaped ones, and the
 * awaitable write pair when it is both. Everything the store needs from the
 * injector — the registry and the destroy hook — is captured here, so the
 * store's methods stay callable afterwards, outside any injection context.
 * `value()` and a bare `matchResult()` are memoised, so repeated calls share one
 * subscription.
 *
 * **Gotchas**
 *
 * Must be called from an injection context. Each caller gets its own store over
 * the same atom; it is the shared registry, not the store, that keeps them in
 * step. Pass `registry` in the options only to opt out of that sharing, which
 * gives the store a private registry that it also disposes.
 *
 * **Example** (Sharing one store through an injection token)
 *
 * ```ts
 * import { InjectionToken } from "@angular/core"
 * import { injectMakeAtom } from "@effect/atom-angular"
 * import { Atom } from "effect/unstable/reactivity"
 *
 * const countAtom = Atom.make(0)
 *
 * export const COUNT_STORE = new InjectionToken("COUNT_STORE", {
 *   providedIn: "root",
 *   factory: () => injectMakeAtom(countAtom)
 * })
 * ```
 *
 * @see {@link AtomStore} for how the surface is selected from the atom type
 * @see {@link AtomRegistryOptions} for the private-registry option
 *
 * @category injection
 * @since 4.0.0
 */
export const injectMakeAtom = <T extends Atom.Atom<any>>(
  source: T,
  options?: AtomRegistryOptions
): AtomStore<T> => {
  type R = AtomValue<T>
  type W = AtomWriteValue<T>

  const atom = source as Atom.Atom<R>
  const registry = injectScopedRegistry(options)
  const destroyRef = injectDestroyRef()

  // Resolved once, when the store is bound. `Atom.isWritable` is a real guard,
  // so this narrowing is sound; what it cannot infer is W, which the explicit
  // type arguments pin.
  const writable = Atom.isWritable<R, W>(atom) ? atom : undefined

  const requireWritable = (): Atom.Writable<R, W> => {
    if (!writable) {
      throw new Error("[@effect/atom-angular] cannot write to a read-only atom")
    }

    return writable
  }

  // One signal per store, so repeated `value()` calls share a subscription
  let valueSignal: Signal<R> | undefined

  // The same, for the bare Result view — see `matchResult` for why only the bare one
  let resultView: Signal<AtomResultView<unknown, unknown>> | undefined

  // One keepalive per store, for the same reason
  let mounted = false

  const store = {
    registry,

    value: (): Signal<R> => (valueSignal ??= atomSignal(registry, destroyRef, atom)),

    mount: (): void => {
      if (mounted) return

      mounted = true
      destroyRef.onDestroy(registry.mount(atom))
    },

    computed: <B>(transform: (current: R) => B, options?: AtomComputedOptions<B>): Signal<B> =>
      atomSignal(registry, destroyRef, Atom.map<Atom.Atom<R>, B>(atom, transform), options),

    subscribe: (f: (value: R) => void, options?: AtomSubscribeOptions): void => {
      destroyRef.onDestroy(registry.subscribe(atom, f, options))
    },

    refresh: (): void => registry.refresh(atom),

    set: (value: W): void => registry.set(requireWritable(), value),

    update: (transform: (current: R) => W): void => registry.update(requireWritable(), transform),

    setExit: (value: W): Promise<Exit.Exit<unknown, unknown>> => setExit(registry, requireWritable(), value),

    setPromise: (value: W): Promise<unknown> => setExit(registry, requireWritable(), value).then(flattenExit),

    // Memoised only when called bare. With transforms there is no sound key —
    // two callers passing different closures want different views.
    matchResult: (options?: AtomResultViewOptions<R, unknown, unknown>) => {
      const source = store as unknown as ReadableAtomStore<AsyncResult.AsyncResult<any, any>>

      if (options === undefined) return (resultView ??= atomMatchResult(source))

      return atomMatchResult(
        source,
        options as AtomResultViewOptions<AsyncResult.AsyncResult<any, any>, unknown, unknown>
      )
    }
  }

  // The object is structurally wider than the derived store type: it always
  // carries the write members, and the conditional type is what removes them
  // from view. This cast narrows — it does not paper over a mismatch.
  return store as unknown as AtomStore<T>
}
