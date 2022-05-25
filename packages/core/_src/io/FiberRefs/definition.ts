export const FiberRefsSym = Symbol.for("@effect/core/io/FiberRefs")
export type FiberRefsSym = typeof FiberRefsSym

/**
 * `FiberRefs` is a data type that represents a collection of `FiberRef` values.
 * This allows safely propagating `FiberRef` values across fiber boundaries, for
 * example between an asynchronous producer and consumer.
 *
 * @tsplus type ets/FiberRefs
 */
export interface FiberRefs {
  readonly [FiberRefsSym]: FiberRefsSym
}

/**
 * @tsplus type ets/FiberRefs/Ops
 */
export interface FiberRefsOps {
  $: FiberRefsAspects
}
export const FiberRefs: FiberRefsOps = {
  $: {}
}

/**
 * @tsplus type ets/FiberRefs/Aspects
 */
export interface FiberRefsAspects {}
