export const RefSym = Symbol.for("@effect/core/io/Ref")
export type RefSym = typeof RefSym

export const SynchronizedSym = Symbol.for("@effect/core/io/Ref/Synchronized")
export type SynchronizedSym = typeof SynchronizedSym

export const _A = Symbol.for("@effect/core/io/Ref/A")
export type _A = typeof _A

/**
 * A `Ref` is a purely functional description of a mutable reference. The
 * fundamental operations of a `Ref` are `set` and `get`. `set` sets the
 * reference to a new value. `get` gets the current value of the reference.
 *
 * By default, `Ref` is implemented in terms of compare and swap operations for
 * maximum performance and does not support performing effects within update
 * operations. If you need to perform effects within update operations you can
 * create a `Ref.Synchronized`, a specialized type of `Ref` that supports
 * performing effects within update operations at some cost to performance. In
 * this case writes will semantically block other writers, while multiple
 * readers can read simultaneously.
 *
 * NOTE: While `Ref` provides the functional equivalent of a mutable reference,
 * the value inside the `Ref` should normally be immutable since compare and
 * swap operations are not safe for mutable values that do not support
 * concurrent access. If you do need to use a mutable value `Ref.Synchronized`
 * will guarantee that access to the value is properly synchronized.
 *
 * @tsplus type ets/Ref
 */
export interface Ref<A> {
  /**
   * Internal Discriminator
   */
  readonly [RefSym]: RefSym

  /**
   * Internal Variance Marker
   */
  readonly [_A]: () => A

  /**
   * Reads the value from the `Ref`.
   */
  get(this: this, __tsplusTrace?: string): Effect.UIO<A>

  /**
   * Atomically modifies the `Ref` with the specified function, which computes a
   * return value for the modification. This is a more powerful version of
   * `update`.
   */
  modify<B>(this: this, f: (a: A) => Tuple<[B, A]>, __tsplusTrace?: string): Effect.UIO<B>

  /**
   * Writes a new value to the `Ref`, with a guarantee of immediate consistency
   * (at some cost to performance).
   */
  set(this: this, a: A, __tsplusTrace?: string): Effect.UIO<void>

  /**
   * Writes a new value to the `Ref` without providing a guarantee of immediate
   * consistency.
   */
  setAsync(this: this, a: A, __tsplusTrace?: string): Effect.UIO<void>

  /**
   * Atomically writes the specified value to the `Ref`, returning the value
   * immediately before modification.
   */
  getAndSet(this: this, a: A, __tsplusTrace?: string): Effect.UIO<A>

  /**
   * Atomically modifies the `Ref` with the specified function, returning the
   * value immediately before modification.
   */
  getAndUpdate(this: this, f: (a: A) => A, __tsplusTrace?: string): Effect.UIO<A>

  /**
   * Atomically modifies the `Ref` with the specified partial function,
   * returning the value immediately before modification. If the function is
   * undefined on the current value it doesn't change it.
   */
  getAndUpdateSome(this: this, pf: (a: A) => Maybe<A>, __tsplusTrace?: string): Effect.UIO<A>

  /**
   * Atomically modifies the `Ref` with the specified partial function, which
   * computes a return value for the modification if the function is defined on
   * the current value otherwise it returns a default value. This is a more
   * powerful version of `updateSome`.
   */
  modifySome<B>(this: this, fallback: B, pf: (a: A) => Maybe<Tuple<[B, A]>>, __tsplusTrace?: string): Effect.UIO<B>

  /**
   * Atomically modifies the `Ref` with the specified function.
   */
  update(this: this, f: (a: A) => A, __tsplusTrace?: string): Effect.UIO<void>

  /**
   * Atomically modifies the `Ref` with the specified function and returns the
   * updated value.
   */
  updateAndGet(this: this, f: (a: A) => A, __tsplusTrace?: string): Effect.UIO<A>

  /**
   * Atomically modifies the `Ref` with the specified partial function. If the
   * function is undefined on the current value it doesn't change it.
   */
  updateSome(this: this, pf: (a: A) => Maybe<A>, __tsplusTrace?: string): Effect.UIO<void>

  /**
   * Atomically modifies the `Ref` with the specified partial function. If the
   * function is undefined on the current value it returns the old value without
   * changing it.
   */
  updateSomeAndGet(this: this, pf: (a: A) => Maybe<A>, __tsplusTrace?: string): Effect.UIO<A>
}

export declare namespace Ref {
  export interface Synchronized<A> extends Ref<A> {
    /**
     * Atomically modifies the `Ref.Synchronized` with the specified function,
     * which computes a return value for the modification. This is a more
     * powerful version of `update`.
     */
    modifyEffect<R, E, B>(
      this: this,
      f: (a: A) => Effect<R, E, Tuple<[B, A]>>,
      __tsplusTrace?: string
    ): Effect<R, E, B>

    /**
     * Atomically modifies the `Ref.Synchronized` with the specified function,
     * returning the value immediately before modification.
     */
    getAndUpdateEffect<R, E>(
      this: this,
      f: (a: A) => Effect<R, E, A>,
      __tsplusTrace?: string
    ): Effect<R, E, A>

    /**
     * Atomically modifies the `Ref.Synchronized` with the specified partial
     * function, returning the value immediately before modification. If the
     * function is undefined on the current value it doesn't change it.
     */
    getAndUpdateSomeEffect<R, E>(
      this: this,
      pf: (a: A) => Maybe<Effect<R, E, A>>,
      __tsplusTrace?: string
    ): Effect<R, E, A>

    /**
     * Atomically modifies the `Ref.Synchronized` with the specified function,
     * which computes a return value for the modification if the function is
     * defined in the current value otherwise it returns a default value. This
     * is a more powerful version of `updateSome`.
     */
    modifySomeEffect<R, E, B>(
      this: this,
      fallback: B,
      pf: (a: A) => Maybe<Effect<R, E, Tuple<[B, A]>>>,
      __tsplusTrace?: string
    ): Effect<R, E, B>

    /**
     * Atomically modifies the `Ref.Synchronized` with the specified function.
     */
    updateEffect<R, E>(this: this, f: (a: A) => Effect<R, E, A>, __tsplusTrace?: string): Effect<R, E, void>

    /**
     * Atomically modifies the `Ref.Synchronized` with the specified function,
     * returning the value immediately after modification.
     */
    updateAndGetEffect<R, E>(
      this: this,
      f: (a: A) => Effect<R, E, A>,
      __tsplusTrace?: string
    ): Effect<R, E, A>

    /**
     * Atomically modifies the `Ref.Synchronized` with the specified partial
     * function. If the function is undefined on the current value it doesn't
     * change it.
     */
    updateSomeEffect<R, E>(
      this: this,
      pf: (a: A) => Maybe<Effect<R, E, A>>,
      __tsplusTrace?: string
    ): Effect<R, E, void>

    /**
     * Atomically modifies the `Ref.Synchronized` with the specified partial
     * function. If the function is undefined on the current value it returns
     * the old value without changing it.
     */
    updateSomeAndGetEffect<R, E>(
      this: this,
      pf: (a: A) => Maybe<Effect<R, E, A>>,
      __tsplusTrace?: string
    ): Effect<R, E, A>
  }
}

/**
 * @tsplus type ets/Ref/Synchronized/Ops
 */
export interface SynchronizedOps {
}

export const Synchronized: SynchronizedOps = {}

/**
 * @tsplus type ets/Ref/Ops
 */
export interface RefOps {
  Synchronized: SynchronizedOps
}

export const Ref: RefOps = {
  Synchronized
}
