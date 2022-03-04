import type { Ord } from "../../../prelude/Ord"
import type { USTM } from "../../STM"
import { TPriorityQueue } from "../definition"

/**
 * Makes a new `TPriorityQueue` that is initialized with specified values.
 *
 * @tsplus static ets/TPriorityQueueOps make
 */
export function make<A>(ord: Ord<A>) {
  return (...data: Array<A>): USTM<TPriorityQueue<A>> =>
    TPriorityQueue.fromIterable(ord)(data)
}
