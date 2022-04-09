/**
 * A `Queue` is a lightweight, asynchronous queue into which values can be
 * enqueued and of which elements can be dequeued.
 *
 * @tsplus type ets/Queue
 */
export interface Queue<A> extends Enqueue<A>, Dequeue<A> {}

/**
 * @tsplus type ets/Queue/Ops
 */
export interface QueueOps {
  $: QueueAspects;
}
export const Queue: QueueOps = {
  $: {}
};

/**
 * @tsplus type ets/Queue/Aspects
 */
export interface QueueAspects {}
