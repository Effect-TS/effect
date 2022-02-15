import type { Chunk } from "../../../collection/immutable/Chunk"
import type { Tuple } from "../../../collection/immutable/Tuple"
import type { RIO } from "../../Effect"
import { Schedule } from "../definition"

/**
 * A schedule that recurs until the effectful condition f fails, collecting
 * all inputs into a list.
 *
 * @tsplus static ets/ScheduleOps collectUntilEffect
 */
export function collectUntilEffect<Env, A>(
  f: (a: A) => RIO<Env, boolean>
): Schedule.WithState<Tuple<[void, Chunk<A>]>, Env, A, Chunk<A>> {
  return Schedule.recurUntilEffect(f).collectAll()
}
