export const RefSym = Symbol.for("@effect/core/io/Ref")
export type RefSym = typeof RefSym

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
  readonly [RefSym]: RefSym
  readonly [_A]: () => A
}

export declare namespace Ref {
  type Synchronized<A> = SynchronizedRef<A>
}

/**
 * @tsplus type ets/Ref/Ops
 */
export interface RefOps {
  $: RefAspects
}
export const Ref: RefOps = {
  $: {}
}

/**
 * @tsplus type ets/Ref/Aspects
 */
export interface RefAspects {}
