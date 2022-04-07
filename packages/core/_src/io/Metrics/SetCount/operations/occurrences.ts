import { withSetCount } from "@effect/core/io/Metrics/SetCount/operations/_internal/InternalSetCount";

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
  return withSetCount(self, (setCount) => setCount.occurrences());
}
