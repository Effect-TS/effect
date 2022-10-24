/**
 * @category symbol
 * @since 1.0.0
 */
export const TRefSym = Symbol.for("@effect/core/stm/TRef")

/**
 * @category symbol
 * @since 1.0.0
 */
export type TRefSym = typeof TRefSym

/**
 * @category symbol
 * @since 1.0.0
 */
export const _A = Symbol.for("@effect/core/stm/TRef/A")

/**
 * @category symbol
 * @since 1.0.0
 */
export type _A = typeof _A

/**
 * A `TRef` is a purely functional description of a mutable reference that can
 * be modified as part of a transactional effect. The fundamental operations of
 * a `TRef` are `set` and `get`. `set` transactionally sets the reference to a
 * new value. `get` gets the current value of the reference.
 *
 * NOTE: While `TRef` provides the transactional equivalent of a mutable
 * reference, the value inside the `TRef` should be immutable. For performance
 * reasons `TRef` is implemented in terms of compare and swap operations rather
 * than synchronization. These operations are not safe for mutable values that
 * do not support concurrent access.
 *
 * @tsplus type effect/core/stm/TRef
 * @category model
 * @since 1.0.0
 */
export interface TRef<A> {
  readonly [TRefSym]: TRefSym
  readonly [_A]: () => A
}

/**
 * @tsplus type effect/core/stm/TRef.Ops
 * @category model
 * @since 1.0.0
 */
export interface TRefOps {
  $: TRefAspects
}
export const TRef: TRefOps = {
  $: {}
}

/**
 * @tsplus type effect/core/stm/TRef.Aspects
 * @category model
 * @since 1.0.0
 */
export interface TRefAspects {}
