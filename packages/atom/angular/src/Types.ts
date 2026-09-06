/**
 * The type-level surface of the Angular Atom bindings: the option bags the
 * injection functions accept, the helpers that read an atom's value, write, and
 * error types back out of its type, the flattened `Result` view a template can
 * render, and the store interfaces `injectMakeAtom` returns.
 *
 * The store interfaces are layered so a store exposes only what its atom
 * supports. Reading and deriving are always available, writing is added for a
 * writable atom, and `matchResult` is added for a `Result`-shaped one, with
 * `AtomStore` selecting the right combination from the atom type alone.
 *
 * @since 4.0.0
 */
import type { Signal, ValueEqualityFn } from "@angular/core"
import type * as Cause from "effect/Cause"
import type * as Exit from "effect/Exit"
import type * as AsyncResult from "effect/unstable/reactivity/AsyncResult"
import type * as Atom from "effect/unstable/reactivity/Atom"
import type * as AtomRegistry from "effect/unstable/reactivity/AtomRegistry"
// `typeof` needs the binding, not the value, so this stays type-only and cannot
// form a runtime cycle with `Constants.ts`
import type { ATOM_RESULT_STATUS } from "./Constants.ts"

// One shape for all three branches, so `waiting` and `readonly` live in one place
type ResultBranch<Status extends AtomResultStatus, V, E> = {
  readonly status: Status
  // Orthogonal to the tag: any branch can be waiting on the next run
  readonly waiting: boolean
  readonly value: V
  readonly error: E
}

/**
 * Options accepted when creating an `AtomRegistry`.
 *
 * **Details**
 *
 * Derived from the parameter of `AtomRegistry.make` rather than restated, so the
 * option set tracks the installed version of `effect` automatically. It carries
 * `initialValues`, `scheduleTask`, `timeoutResolution`, and `defaultIdleTTL`.
 *
 * @see {@link AtomRegistryOptions} for the per-store option that opts into a private registry
 *
 * @category models
 * @since 4.0.0
 */
export type RegistryOptions = NonNullable<Parameters<typeof AtomRegistry.make>[0]>

/**
 * Options accepted by an atom subscription.
 *
 * **Details**
 *
 * Derived from the third parameter of `AtomRegistry.subscribe` rather than
 * restated, because every caller forwards this bag to the registry unchanged. It
 * carries a single `immediate` flag: when `true` the callback is invoked once
 * with the current value before the first change. It defaults to `false`.
 *
 * @category models
 * @since 4.0.0
 */
export type AtomSubscribeOptions = NonNullable<Parameters<AtomRegistry.AtomRegistry["subscribe"]>[2]>

/**
 * Options controlling how a derived signal decides that its value has not
 * changed.
 *
 * **When to use**
 *
 * Use when a transform returns a freshly built object or array on every run and
 * the consumer should only be notified when the projected value actually
 * differs.
 *
 * **Details**
 *
 * `equal` is Angular's `ValueEqualityFn`, narrowed to the one field the bindings
 * forward; Angular's own `debugName` is not accepted. When `equal` is omitted
 * Angular falls back to `Object.is`, which is reference equality and so never
 * holds for a fresh object — a projection that collapses distinct values then
 * notifies on every recompute.
 *
 * @category models
 * @since 4.0.0
 */
export type AtomComputedOptions<B> = {
  readonly equal?: ValueEqualityFn<B>
}

/**
 * The value an atom reads, extracted from the atom's type.
 *
 * **Details**
 *
 * An alias for `Atom.Type`, kept here so the store types name their read type
 * with the same vocabulary as their write type.
 *
 * @see {@link AtomWriteValue} for the value an atom accepts on write
 *
 * @category utility types
 * @since 4.0.0
 */
export type AtomValue<T extends Atom.Atom<any>> = Atom.Type<T>

/**
 * The value an atom accepts on write, extracted from the atom's type, or `never`
 * when the atom is read-only.
 *
 * **Details**
 *
 * The conditional is written in guarded form, `[T] extends [...]`, so a union of
 * atom types is treated as one type instead of being distributed over, which
 * would otherwise produce a union of write types for a source that is only
 * sometimes writable.
 *
 * @see {@link AtomValue} for the value an atom reads
 *
 * @category utility types
 * @since 4.0.0
 */
export type AtomWriteValue<T extends Atom.Atom<any>> = [T] extends [Atom.Writable<any, infer W>] ? W
  : never

/**
 * The success value carried by a `Result`-shaped atom value, or `never` when the
 * value is not `Result`-shaped.
 *
 * **Details**
 *
 * The conditional is written in guarded form, `[R] extends [...]`, so a union of
 * atom value types is not distributed over.
 *
 * @see {@link AtomFailure} for the matching error type
 *
 * @category utility types
 * @since 4.0.0
 */
export type AtomSuccess<R> = [R] extends [AsyncResult.AsyncResult<infer A, any>] ? A : never

/**
 * The error type carried by a `Result`-shaped atom value, or `never` when the
 * value is not `Result`-shaped.
 *
 * **Details**
 *
 * The conditional is written in guarded form, `[R] extends [...]`, so a union of
 * atom value types is not distributed over. This is the error type, not the
 * `Cause` — a failure transform receives `Cause<AtomFailure<R>>`.
 *
 * @see {@link AtomSuccess} for the matching success type
 *
 * @category utility types
 * @since 4.0.0
 */
export type AtomFailure<R> = [R] extends [AsyncResult.AsyncResult<any, infer E>] ? E : never

/**
 * The `Exit` a write against a `Result`-shaped atom settles into.
 *
 * **Details**
 *
 * Pairs {@link AtomSuccess} with {@link AtomFailure}, so an `Exit` produced by an
 * awaitable write stays typed on both channels instead of collapsing to
 * `Exit<unknown, unknown>`.
 *
 * @category utility types
 * @since 4.0.0
 */
export type AtomExit<R> = Exit.Exit<AtomSuccess<R>, AtomFailure<R>>

/**
 * The part of an `AtomRegistry` a store exposes to its consumers.
 *
 * **Details**
 *
 * Picks `get`, `subscribe`, `mount`, `refresh`, and `getNodes`. Writes are left
 * out so they go through the store and stay typed against the atom's own write
 * type.
 *
 * **Gotchas**
 *
 * `reset`, `dispose`, and `setSerializable` are also left out: lifetime belongs
 * to whoever created the registry, and a store that joined the injector's shared
 * registry must not be able to dispose it out from under the other stores. Reach
 * for `injectAtomRegistry` when those operations are genuinely needed.
 *
 * @category models
 * @since 4.0.0
 */
export type AtomRegistryView = Pick<
  AtomRegistry.AtomRegistry,
  "get" | "subscribe" | "mount" | "refresh" | "getNodes"
>

/**
 * Options selecting which `AtomRegistry` a store binds to.
 *
 * **When to use**
 *
 * Use when a store must not share state with the rest of the injector scope, for
 * example a wizard or a modal whose atoms should start clean each time it opens.
 *
 * **Gotchas**
 *
 * Omitting `registry` is the common case, and it is what lets related atoms in
 * the same injector scope see each other's writes. Passing it — even as `{}` —
 * creates a second, independent copy of the atom graph.
 *
 * @see {@link RegistryOptions} for the options the private registry is built with
 *
 * @category models
 * @since 4.0.0
 */
export type AtomRegistryOptions = {
  /**
   * Opts the store out of the shared registry and gives it a private one, owned
   * and disposed by the store.
   *
   * **Details**
   *
   * Omit it to join the registry of the injector scope, which is what lets
   * related atoms see each other's writes.
   */
  readonly registry?: RegistryOptions
}

/**
 * The set of status tags a flattened `Result` view can carry.
 *
 * **Details**
 *
 * Derived from `ATOM_RESULT_STATUS` with an indexed access rather than written
 * out, so the union and the constant cannot name different tag sets.
 *
 * @see {@link ATOM_RESULT_STATUS} for the runtime values these tags are compared against
 *
 * @category models
 * @since 4.0.0
 */
export type AtomResultStatus = (typeof ATOM_RESULT_STATUS)[keyof typeof ATOM_RESULT_STATUS]

/**
 * The three states of a `Result`, flattened into one object a template can read.
 *
 * **Details**
 *
 * A discriminated union over `status`, so a template guard on
 * `view().status === 'success'` narrows `value` to `S` and `error` to `null`.
 * Every branch also carries `waiting`, which is orthogonal to the tag: any branch
 * can be waiting on the next run.
 *
 * **Gotchas**
 *
 * The tag is what makes narrowing work. A flat `value: S | null` narrows nothing
 * when `S` is itself nullable, and forces a non-null assertion in the template.
 * The failure branch keeps only the transformed error, so the `previousSuccess`
 * carried by the underlying `AsyncResult.Failure` is not reachable through this
 * view.
 *
 * @see {@link AtomResultViewOptions} for the transforms and comparator that produce it
 *
 * @category models
 * @since 4.0.0
 */
export type AtomResultView<S, F> =
  | ResultBranch<typeof ATOM_RESULT_STATUS.INITIAL, null, null>
  | ResultBranch<typeof ATOM_RESULT_STATUS.SUCCESS, S, null>
  | ResultBranch<typeof ATOM_RESULT_STATUS.FAILURE, null, F>

/**
 * Per-branch transforms that decide what the flattened `Result` view carries.
 *
 * **Details**
 *
 * Omit a transform and that branch falls back to its default: `S` becomes the
 * atom's own success type, and `F` becomes the string produced by `Cause.pretty`.
 * Supply one and it fixes `S` or `F` by inference. `transformFailure` receives
 * the whole `Cause`, not the bare error.
 *
 * @category models
 * @since 4.0.0
 */
export type AtomResultTransforms<R, S, F> = {
  readonly transformSuccess?: (value: AtomSuccess<R>) => S
  readonly transformFailure?: (cause: Cause.Cause<AtomFailure<R>>) => F
}

/**
 * Everything the flattened `Result` view accepts: the per-branch transforms plus
 * the comparator the derived signal notifies by.
 *
 * **Details**
 *
 * The default comparator holds when `status` and `waiting` are identical and
 * `value` and `error` are equal under `Equal.equals`, which is a structural
 * comparison for plain objects and arrays as well as for Effect data types.
 * Supply `equal` to widen or narrow that, for example to compare only an `id`
 * when the payload is large.
 *
 * **Gotchas**
 *
 * The default comparator runs on every emission, over the whole payload.
 * `Equal.equals` also caches each object pair, so a payload mutated in place
 * after its first comparison can keep comparing equal and stop notifying.
 *
 * @see {@link AtomResultTransforms} for the transform half of these options
 * @see {@link AtomComputedOptions} for the comparator half
 *
 * @category models
 * @since 4.0.0
 */
export type AtomResultViewOptions<R, S, F> =
  & AtomResultTransforms<R, S, F>
  & AtomComputedOptions<AtomResultView<S, F>>

/**
 * The store surface available for every atom: reading it as a signal, deriving
 * from it, mounting it, subscribing to it, and refreshing it.
 *
 * **Details**
 *
 * Reading and deriving never require writability, so this is the base every
 * other store interface extends. Every method captured its registry and its
 * destroy hook when the store was created, so they stay callable outside an
 * injection context.
 *
 * @see {@link AtomStore} for the interface selected from a given atom type
 *
 * @category models
 * @since 4.0.0
 */
export interface ReadableAtomStore<R> {
  /**
   * The registry this store is bound to, narrowed to reads and subscriptions.
   */
  readonly registry: AtomRegistryView
  /**
   * Returns the atom's value as an Angular signal.
   *
   * **Details**
   *
   * The signal is built on first call and shared from then on, so repeated calls
   * share one subscription. Reading it mounts the atom.
   */
  value(): Signal<R>
  /**
   * Derives a projection inside the atom graph and returns it as a signal.
   *
   * **Gotchas**
   *
   * Each call builds a new derived atom and a new subscription, so this is meant
   * to be called once and stored, not called from a template expression.
   */
  computed<B>(transform: (current: R) => B, options?: AtomComputedOptions<B>): Signal<B>
  /**
   * Re-runs the atom's read, discarding whatever a write had put there.
   *
   * **Gotchas**
   *
   * A state atom is re-seeded with its initial value.
   */
  refresh(): void
  /**
   * Keeps the atom alive for the store's lifetime without reading it as a
   * signal.
   *
   * **Details**
   *
   * A mounted atom holds its state between reads instead of being recomputed.
   * The keepalive is released when the injector that built the store is
   * destroyed.
   *
   * **Gotchas**
   *
   * Calling this more than once is a no-op. Reading `value()` mounts the atom
   * too, so a store that reads its atom does not need this.
   */
  mount(): void
  /**
   * Observes the atom without materialising a signal for it.
   *
   * **Details**
   *
   * The subscription runs until the injector that built the store is destroyed.
   * It does not fire with the current value unless `immediate` is set.
   *
   * **Gotchas**
   *
   * There is no unsubscribe handle. Use `registry.subscribe` directly for a
   * subscription that must end earlier than the injector.
   */
  subscribe(f: (value: R) => void, options?: AtomSubscribeOptions): void
}

/**
 * The store surface added when the atom's value is `Result`-shaped.
 *
 * **Details**
 *
 * Reachable whenever the atom is `Result`-shaped, independently of writability,
 * because the query atoms this exists for are usually read-only.
 *
 * @see {@link AtomResultView} for the shape `matchResult` produces
 *
 * @category models
 * @since 4.0.0
 */
export interface ResultAtomStore<R> extends ReadableAtomStore<R> {
  /**
   * Flattens the three `Result` states into one template-ready signal.
   *
   * **Details**
   *
   * `S` and `F` are inferred from the transforms, and default to the atom's own
   * success type and to a `Cause.pretty` string when the transforms are absent.
   * The bare call is memoised per store; a call with options builds a fresh
   * derived signal each time.
   */
  matchResult<S = AtomSuccess<R>, F = string>(
    options?: AtomResultViewOptions<R, S, F>
  ): Signal<AtomResultView<S, F>>
}

/**
 * The store surface added when the atom is writable.
 *
 * **Details**
 *
 * Reachable only when the atom type is `Atom.Writable`, so `set` and `update` do
 * not appear on a store built over a read-only atom.
 *
 * @see {@link AsyncAtomStore} for the surface when the atom is also `Result`-shaped
 *
 * @category models
 * @since 4.0.0
 */
export interface WritableAtomStore<R, W> extends ReadableAtomStore<R> {
  /**
   * Writes a value to the atom.
   */
  set(value: W): void
  /**
   * Writes a value derived from the atom's current one, in a single registry
   * pass.
   */
  update(transform: (current: R) => W): void
}

/**
 * The store surface for an atom that is both writable and `Result`-shaped: the
 * synchronous writes, the `Result` view, and the two awaitable writes.
 *
 * **Details**
 *
 * Reachable only when both axes hold, because only then does a write start a run
 * whose outcome can be awaited.
 *
 * @category models
 * @since 4.0.0
 */
export interface AsyncAtomStore<R, W> extends WritableAtomStore<R, W>, ResultAtomStore<R> {
  /**
   * Writes the atom and resolves with the success value of the run that write
   * started.
   *
   * **Gotchas**
   *
   * Rejects with the squashed cause, which loses the typed error channel. Use
   * `setExit` to keep it.
   */
  setPromise(value: W): Promise<AtomSuccess<R>>
  /**
   * Writes the atom and resolves with the `Exit` of the run that write started.
   *
   * **Details**
   *
   * The promise settles on the first `Success` or `Failure` that is not itself
   * waiting on another run.
   */
  setExit(value: W): Promise<AtomExit<R>>
}

/**
 * The store interface selected from an atom's type.
 *
 * **Details**
 *
 * Writability and `Result`-shape are independent axes. A read-only atom gets no
 * write members on the type at all, while `matchResult` follows the other axis,
 * so a read-only query atom keeps it and a writable non-`Result` atom does not.
 *
 * **Gotchas**
 *
 * This only removes members from view. The object the store constructor returns
 * always carries every member at runtime, so a store reached through an `any` can
 * still call a write or `matchResult`, and fails at the point of use rather than
 * at the call site.
 *
 * @see {@link ReadableAtomStore} for the members every store has
 *
 * @category utility types
 * @since 4.0.0
 */
export type AtomStore<T extends Atom.Atom<any>> = [T] extends [Atom.Writable<infer R, infer W>]
  ? [R] extends [AsyncResult.AsyncResult<any, any>] ? AsyncAtomStore<R, W>
  : WritableAtomStore<R, W>
  : [AtomValue<T>] extends [AsyncResult.AsyncResult<any, any>] ? ResultAtomStore<AtomValue<T>>
  : ReadableAtomStore<AtomValue<T>>
