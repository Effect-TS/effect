import type { _A } from "../../support/Symbols"

export const TPriorityQueueSym = Symbol.for("@effect-ts/core/stm/TPriorityQueue")
export type TPriorityQueueSym = typeof TPriorityQueueSym

/**
 * @tsplus type ets/TPriorityQueue
 */
export interface TPriorityQueue<A> {
  readonly [TPriorityQueueSym]: TPriorityQueueSym
  readonly [_A]: () => A
}

/**
 * @tsplus type ets/TPriorityQueueOps
 */
export interface TPriorityQueueOps {}
export const TPriorityQueue: TPriorityQueueOps = {}

/**
 * @tsplus unify ets/TPriorityQueue
 */
export function unifyTPriorityQueue<X extends TPriorityQueue<any>>(
  self: X
): TPriorityQueue<[X] extends [TPriorityQueue<infer AX>] ? AX : never> {
  return self
}
