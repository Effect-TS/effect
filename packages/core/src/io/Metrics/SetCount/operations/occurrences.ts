import type { Chunk } from "../../../../collection/immutable/Chunk"
import type { Tuple } from "../../../../collection/immutable/Tuple"
import type { UIO } from "../../../Effect"
import type { SetCount } from "../definition"
import { withSetCount } from "./_internal/InternalSetCount"

/**
 * Returns the number of occurrences of every value observed by this set
 * count.
 *
 * @tsplus fluent ets/SetCount occurrences
 */
export function occurrences<A>(
  self: SetCount<A>,
  __tsplusTrace?: string
): UIO<Chunk<Tuple<[string, number]>>> {
  return withSetCount(self, (setCount) => setCount.occurrences())
}
