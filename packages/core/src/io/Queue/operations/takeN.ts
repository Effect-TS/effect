import type { Chunk } from "../../../collection/immutable/Chunk"
import type { UIO } from "../../Effect"
import type { Queue } from "../definition"

/**
 * Takes the specified number of elements from the queue. If there are fewer
 * than the specified number of elements available, it suspends until they
 * become available.
 *
 * @tsplus fluent ets/Queue takeN
 */
export function takeN_<A>(
  self: Queue<A>,
  n: number,
  __tsplusTrace?: string
): UIO<Chunk<A>> {
  return self.takeBetween(n, n)
}

/**
 * Takes the specified number of elements from the queue. If there are fewer
 * than the specified number of elements available, it suspends until they
 * become available.
 */
export const takeN = Pipeable(takeN_)
