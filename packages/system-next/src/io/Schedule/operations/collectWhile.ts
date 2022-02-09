import type { Chunk } from "../../../collection/immutable/Chunk"
import type { Tuple } from "../../../collection/immutable/Tuple"
import type { Predicate } from "../../../data/Function"
import { Schedule } from "../definition"

/**
 * A schedule that recurs as long as the condition f holds, collecting all
 * inputs into a list.
 *
 * @tsplus static ets/ScheduleOps collectWhile
 */
export function collectWhile<A>(
  f: Predicate<A>
): Schedule.WithState<Tuple<[void, Chunk<A>]>, unknown, A, Chunk<A>> {
  return Schedule.recurWhile(f).collectAll()
}
