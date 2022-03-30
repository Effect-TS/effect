import type { Option } from "../../../data/Option"
import type { UIO } from "../../Effect"
import type { Queue } from "../definition"

/**
 * Take the head option of values in the queue.
 *
 * @tsplus fluent ets/Queue poll
 */
export function poll<A>(self: Queue<A>, __tsplusTrace?: string): UIO<Option<A>> {
  return self.takeUpTo(1).map((chunk) => chunk.head)
}
