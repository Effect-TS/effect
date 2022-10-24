/**
 * @category symbol
 * @since 1.0.0
 */
export const TQueueSym = Symbol.for("@effect/core/stm/TQueue")

/**
 * @category symbol
 * @since 1.0.0
 */
export type TQueueSym = typeof TQueueSym

/**
 * @category symbol
 * @since 1.0.0
 */
export const _A = Symbol.for("@effect/core/stm/TQueue/A")

/**
 * @category symbol
 * @since 1.0.0
 */
export type _A = typeof _A

/**
 * A `TQueue` is a transactional queue. Offerors can offer values to the queue
 * and takers can take values from the queue.
 *
 * @tsplus type effect/core/stm/TQueue
 * @category model
 * @since 1.0.0
 */
export interface TQueue<A> {
  readonly [TQueueSym]: TQueueSym
  readonly [_A]: (_: A) => A
}

/**
 * @tsplus type effect/core/stm/TQueue.Ops
 * @category model
 * @since 1.0.0
 */
export interface TQueueOps {
  $: TQueueAspects
}
export const TQueue: TQueueOps = {
  $: {}
}

/**
 * @tsplus type effect/core/stm/TQueue.Aspects
 * @category model
 * @since 1.0.0
 */
export interface TQueueAspects {}

/**
 * @tsplus type effect/core/stm/TQueue
 * @category model
 * @since 1.0.0
 */
export type Strategy = BackPressure | Dropping | Sliding

/**
 * @category model
 * @since 1.0.0
 */
export interface BackPressure {
  _tag: "BackPressure"
}

/**
 * @category model
 * @since 1.0.0
 */
export interface Dropping {
  _tag: "Dropping"
}

/**
 * @category model
 * @since 1.0.0
 */
export interface Sliding {
  _tag: "Sliding"
}

/**
 * @tsplus static effect/core/stm/TQueue.Ops BackPressure
 * @category constructors
 * @since 1.0.0
 */
export const BackPressure: Strategy = {
  _tag: "BackPressure"
}

/**
 * @tsplus static effect/core/stm/TQueue.Ops Dropping
 * @category constructors
 * @since 1.0.0
 */
export const Dropping: Strategy = {
  _tag: "Dropping"
}

/**
 * @tsplus static effect/core/stm/TQueue.Ops Sliding
 * @category constructors
 * @since 1.0.0
 */
export const Sliding: Strategy = {
  _tag: "Sliding"
}
