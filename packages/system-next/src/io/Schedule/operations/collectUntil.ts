import type { Chunk } from "../../../collection/immutable/Chunk"
import type { Tuple } from "../../../collection/immutable/Tuple"
import type { Predicate } from "../../../data/Function"
import { Schedule } from "../definition"

/**
 * A schedule that recurs until the condition f fails, collecting all inputs
 * into a list.
 *
 * @tsplus static ets/ScheduleOps collectUntil
 */
export function collectUntil<A>(
  f: Predicate<A>
): Schedule.WithState<Tuple<[void, Chunk<A>]>, unknown, A, Chunk<A>> {
  return Schedule.recurUntil(f).collectAll()
}
