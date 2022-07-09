export const FiberRefSym = Symbol.for("@effect/core/io/FiberRef")
export type FiberRefSym = typeof FiberRefSym

export const _Value = Symbol.for("@effect/core/io/FiberRef/Value")
export type _Value = typeof _Value

export const _Patch = Symbol.for("@effect/core/io/FiberRef/Patch")
export type _Patch = typeof _Patch

export namespace FiberRef {
  export interface WithPatch<Value, Patch> {
    /**
     * Type Identifier
     */
    readonly [FiberRefSym]: FiberRefSym

    /**
     * The type of the value of the `FiberRef`.
     */
    readonly [_Value]: Value

    /**
     * The type of the patch that describes updates to the value of the
     * `FiberRef`. In the simple case this will just be a function that sets the
     * value of the `FiberRef`. In more complex cases this will describe an update
     * to a piece of a whole value, allowing updates to the value by different
     * fibers to be combined in a compositional way when those fibers are joined.
     */
    readonly [_Patch]: Patch

    /**
     * Returns the initial value of the `FiberRef`.
     */
    readonly initial: Value

    /**
     * Constructs a patch describing the updates to a value from an old value and
     * a new value.
     */
    readonly diff: (oldValue: Value, newValue: Value) => Patch

    /**
     * Combines two patches to produce a new patch that describes the updates of
     * the first patch and then the updates of the second patch. The combine
     * operation should be associative. In addition, if the combine operation is
     * commutative then joining multiple fibers concurrently will result in
     * deterministic `FiberRef` values.
     */
    readonly combine: (first: Patch, second: Patch) => Patch

    /**
     * Applies a patch to an old value to produce a new value that is equal to the
     * old value with the updates described by the patch.
     */
    readonly patch: (patch: Patch) => (oldValue: Value) => Value

    /**
     * The initial patch that is applied to the value of the `FiberRef` when a new
     * fiber is forked.
     */
    readonly fork: Patch

    /**
     * Deletes the ref value
     */
    delete(this: FiberRef.WithPatch<Value, Patch>, __tsplusTrace?: string): Effect<never, never, void>

    /**
     * Reads the value associated with the current fiber. Returns initial value if
     * no value was `set` or inherited from parent.
     */
    get(this: FiberRef.WithPatch<Value, Patch>, __tsplusTrace?: string): Effect<never, never, Value>

    /**
     * Atomically modifies the `XFiberRef` with the specified function and
     * returns the old value.
     */
    getAndUpdate(
      this: FiberRef.WithPatch<Value, Patch>,
      f: (a: Value) => Value,
      __tsplusTrace?: string
    ): Effect<never, never, Value>

    /**
     * Atomically modifies the `XFiberRef` with the specified function and returns
     * the old value. If the function is `None` for the current value it doesn't
     * change it.
     */
    getAndUpdateSome(
      this: FiberRef.WithPatch<Value, Patch>,
      pf: (a: Value) => Maybe<Value>,
      __tsplusTrace?: string
    ): Effect<never, never, Value>

    /**
     * Gets the value associated with the current fiber and uses it to run the
     * specified effect.
     */
    getWith<R, E, B>(
      this: FiberRef.WithPatch<Value, Patch>,
      f: (a: Value) => Effect<R, E, B>,
      __tsplusTrace?: string
    ): Effect<R, E, B>

    /**
     * Returns an `Effect` that runs with `value` bound to the current fiber.
     *
     * Guarantees that fiber data is properly restored via `acquireRelease`.
     */
    locally(
      this: FiberRef.WithPatch<Value, Patch>,
      value: Value,
      __tsplusTrace?: string
    ): <R, E, B>(use: Effect<R, E, B>) => Effect<R, E, B>

    /**
     * Returns a scoped effect that sets the value associated with the curent
     * fiber to the specified value as its `acquire` action and restores it to its
     * original value as its `release` action.
     */
    locallyScoped(
      this: FiberRef.WithPatch<Value, Patch>,
      value: Value,
      __tsplusTrace?: string
    ): Effect<Scope, never, void>

    /**
     * Returns a scoped effect that updates the value associated with the
     * current fiber using the specified function and restores it to its
     * original value when the scope is closed.
     */
    locallyScopedWith(
      this: FiberRef.WithPatch<Value, Patch>,
      f: (a: Value) => Value,
      __tsplusTrace?: string
    ): Effect<Scope, never, void>

    /**
     * Returns an effect that runs with `f` applied to the current fiber.
     *
     * Guarantees that fiber data is properly restored via `acquireRelease`.
     */
    locallyWith(
      this: FiberRef.WithPatch<Value, Patch>,
      f: (a: Value) => Value,
      __tsplusTrace?: string
    ): <R, E, B>(effect: Effect<R, E, B>) => Effect<R, E, B>

    /**
     * Atomically modifies the `FiberRef` with the specified function.
     */
    update(
      this: FiberRef.WithPatch<Value, Patch>,
      f: (a: Value) => Value,
      __tsplusTrace?: string
    ): Effect<never, never, void>

    /**
     * Atomically modifies the `FiberRef` with the specified function, which
     * computes a return value for the modification. This is a more powerful
     * version of `update`.
     */
    modify<B>(
      f: (a: Value) => Tuple<[B, Value]>,
      __tsplusTrace?: string
    ): Effect<never, never, B>

    /**
     * Sets the value associated with the current fiber.
     */
    set(
      this: FiberRef.WithPatch<Value, Patch>,
      value: Value,
      __tsplusTrace?: string
    ): Effect<never, never, void>

    /**
     * Atomically modifies the `FiberRef` with the specified partial function,
     * which computes a return value for the modification if the function is
     * defined in the current value otherwise it returns a default value. This
     * is a more powerful version of `updateSome`.
     */
    modifySome<B>(
      this: FiberRef.WithPatch<Value, Patch>,
      def: B,
      f: (a: Value) => Maybe<Tuple<[B, Value]>>,
      __tsplusTrace?: string
    ): Effect<never, never, B>

    /**
     * Reset the value of a `FiberRef` back to its initial value.
     */
    reset(this: FiberRef.WithPatch<Value, Patch>, __tsplusTrace?: string): Effect<never, never, void>

    /**
     * Atomically modifies the `FiberRef` with the specified function and
     * returns the result.
     */
    updateAndGet(
      this: FiberRef.WithPatch<Value, Patch>,
      f: (a: Value) => Value,
      __tsplusTrace?: string
    ): Effect<never, never, Value>

    /**
     * Atomically modifies the `FiberRef` with the specified partial function.
     * If the function is undefined on the current value it doesn't change it.
     */
    updateSome(
      this: FiberRef.WithPatch<Value, Patch>,
      pf: (a: Value) => Maybe<Value>,
      __tsplusTrace?: string
    ): Effect<never, never, void>

    /**
     * Atomically modifies the `FiberRef` with the specified partial function.
     * If the function is undefined on the current value it returns the old
     * value without changing it.
     */
    updateSomeAndGet(
      this: FiberRef.WithPatch<Value, Patch>,
      pf: (a: Value) => Maybe<Value>,
      __tsplusTrace?: string
    ): Effect<never, never, Value>
  }
}

/**
 * A `FiberRef` is Effect-TS's equivalent of Java's `ThreadLocal`. The value of a
 * `FiberRef` is automatically propagated to child fibers when they are forked
 * and merged back in to the value of the parent fiber after they are joined.
 *
 * By default the value of the child fiber will replace the value of the parent
 * fiber on join but you can specify your own logic for how values should be
 * merged.
 *
 * @tsplus type effect/core/io/FiberRef
 */
export interface FiberRef<Value> extends FiberRef.WithPatch<Value, any> {}

/**
 * @tsplus type effect/core/io/FiberRef.Ops
 */
export interface FiberRefOps {
  $: FiberRefAspects
}
export const FiberRef: FiberRefOps = {
  $: {}
}

/**
 * @tsplus type effect/core/io/FiberRef.Aspects
 */
export interface FiberRefAspects {}
