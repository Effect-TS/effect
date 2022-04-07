export const TPriorityQueueSym = Symbol.for("@effect/core/stm/TPriorityQueue");
export type TPriorityQueueSym = typeof TPriorityQueueSym;

export const _A = Symbol.for("@effect/core/stm/TPriorityQueue/A");
export type _A = typeof _A;

/**
 * @tsplus type ets/TPriorityQueue
 */
export interface TPriorityQueue<A> {
  readonly [TPriorityQueueSym]: TPriorityQueueSym;
  readonly [_A]: () => A;
}

/**
 * @tsplus type ets/TPriorityQueue/Ops
 */
export interface TPriorityQueueOps {
  $: TPriorityQueueAspects;
}
export const TPriorityQueue: TPriorityQueueOps = {
  $: {}
};

/**
 * @tsplus type ets/TPriorityQueue/Aspects
 */
export interface TPriorityQueueAspects {}
