import { MutableQueue } from "../../../support/MutableQueue"
import type { UIO } from "../../Effect"
import { Effect } from "../../Effect"
import { Queue } from "../definition"
import { Strategy } from "./strategy"

/**
 * Makes a new unbounded queue.
 *
 * @tsplus static ets/QueueOps unbounded
 */
export function unbounded<A>(__tsplusTrace?: string): UIO<Queue<A>> {
  return Effect.succeed(MutableQueue.Unbounded<A>()).flatMap((queue) =>
    Queue.create(queue, Strategy.Dropping())
  )
}
