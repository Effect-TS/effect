import type { Tuple } from "../../../collection/immutable/Tuple"
import type { Effect } from "../../../io/Effect"
import { GroupBy } from "../../GroupBy"
import type { Stream } from "../definition"

/**
 * More powerful version of `Stream.groupByKey`.
 *
 * @tsplus fluent ets/Stream groupBy
 */
export function groupBy_<R, R2, E, E2, A, K, V>(
  self: Stream<R, E, A>,
  f: (a: A) => Effect<R2, E2, Tuple<[K, V]>>,
  buffer = 16,
  __tsplusTrace?: string
): GroupBy<R & R2, E | E2, K, V, A> {
  return GroupBy(self, f, buffer)
}

/**
 * More powerful version of `Stream.groupByKey`.
 */
export const groupBy = Pipeable(groupBy_)
