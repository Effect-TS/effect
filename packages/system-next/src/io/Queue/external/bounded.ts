import type { UIO } from "../../Effect"
import { makeBoundedQueue } from "../../Effect/operations/excl-forEach"
import type { Queue } from "../definition"

/**
 * Makes a new bounded queue. When the capacity of the queue is reached, any
 * additional calls to `offer` will be suspended until there is more room in
 * the queue.
 *
 * **Note**: When possible use only power of 2 capacities; this will provide
 * better performance by utilising an optimised version of the underlying
 * `RingBuffer`.
 *
 * @tsplus static ets/QueueOps bounded
 */
export const bounded: <A>(
  requestedCapacity: number,
  __etsTrace?: string | undefined
) => UIO<Queue<A>> = makeBoundedQueue
