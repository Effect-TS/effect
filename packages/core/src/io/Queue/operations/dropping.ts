import { MutableQueue } from "../../../support/MutableQueue"
import type { UIO } from "../../Effect"
import { Effect } from "../../Effect"
import { Queue } from "../definition"
import { Strategy } from "./strategy"

/**
 * Makes a new bounded queue with the dropping strategy. When the capacity of
 * the queue is reached, new elements will be dropped.
 *
 * **Note**: When possible use only power of 2 capacities; this will provide
 * better performance by utilising an optimised version of the underlying
 * `RingBuffer`.
 *
 * @tsplus static ets/QueueOps dropping
 */
export function dropping<A>(
  requestedCapacity: number,
  __tsplusTrace?: string
): UIO<Queue<A>> {
  return Effect.succeed(MutableQueue.Bounded<A>(requestedCapacity)).flatMap((queue) =>
    Queue.create(queue, Strategy.Dropping())
  )
}
