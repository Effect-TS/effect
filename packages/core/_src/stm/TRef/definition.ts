export const TRefSym = Symbol.for("@effect-ts/core/stm/TRef");
export type TRefSym = typeof TRefSym;

export const _A = Symbol.for("@effect-ts/core/stm/TRef/A");
export type _A = typeof _A;

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
 * @tsplus type ets/TRef
 */
export interface TRef<A> {
  readonly [TRefSym]: TRefSym;
  readonly [_A]: () => A;
}

/**
 * @tsplus type ets/TRef/Ops
 */
export interface TRefOps {
  $: TRefAspects;
}
export const TRef: TRefOps = {
  $: {}
};

/**
 * @tsplus type ets/TRef/Aspects
 */
export interface TRefAspects {}
