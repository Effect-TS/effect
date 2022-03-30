import type { Dequeue } from "./Dequeue"
import type { Enqueue } from "./Enqueue"

/**
 * A `Queue` is a lightweight, asynchronous queue into which values can be
 * enqueued and of which elements can be dequeued.
 *
 * @tsplus type ets/Queue
 */
export interface Queue<A> extends Enqueue<A>, Dequeue<A> {}

/**
 * @tsplus type ets/QueueOps
 */
export interface QueueOps {}
export const Queue: QueueOps = {}
