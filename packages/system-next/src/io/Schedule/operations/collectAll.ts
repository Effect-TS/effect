import type { Chunk } from "../../../collection/immutable/Chunk"
import type { Tuple } from "../../../collection/immutable/Tuple"
import { Schedule } from "../definition"

/**
 * A schedule that recurs anywhere, collecting all inputs into a `Chunk`.
 *
 * @tsplus static ets/ScheduleOps collectAll
 */
export function collectAll<A>(): Schedule.WithState<
  Tuple<[void, Chunk<A>]>,
  unknown,
  A,
  Chunk<A>
> {
  return Schedule.identity<A>().collectAll()
}
