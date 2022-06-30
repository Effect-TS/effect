export const TQueueSym = Symbol.for("@effect/core/stm/TQueue")
export type TQueueSym = typeof TQueueSym

export const _A = Symbol.for("@effect/core/stm/TQueue/A")
export type _A = typeof _A

/**
 * A `TQueue` is a transactional queue. Offerors can offer values to the queue
 * and takers can take values from the queue.
 *
 * @tsplus type effect/core/stm/TQueue
 */
export interface TQueue<A> {}

/**
 * @tsplus type effect/core/stm/TQueue.Ops
 */
export interface TQueueOps {
  $: TQueueAspects
}
export const TQueue: TQueueOps = {
  $: {}
}

/**
 * @tsplus type effect/core/stm/TQueue.Aspects
 */
export interface TQueueAspects {}

/**
 * @tsplus type effect/core/stm/TQueue
 */
export type Strategy = BackPressure | Dropping | Sliding

export interface BackPressure {
  _tag: "BackPressure"
}

export interface Dropping {
  _tag: "Dropping"
}

export interface Sliding {
  _tag: "Sliding"
}

/**
 * @tsplus static effect/core/stm/TQueue.Ops BackPressure
 */
export const BackPressure: Strategy = {
  _tag: "BackPressure"
}

/**
 * @tsplus static effect/core/stm/TQueue.Ops Dropping
 */
export const Dropping: Strategy = {
  _tag: "Dropping"
}

/**
 * @tsplus static effect/core/stm/TQueue.Ops Sliding
 */
export const Sliding: Strategy = {
  _tag: "Sliding"
}
