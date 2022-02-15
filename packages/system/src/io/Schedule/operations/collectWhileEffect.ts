import type { Chunk } from "../../../collection/immutable/Chunk"
import type { Tuple } from "../../../collection/immutable/Tuple"
import type { RIO } from "../../Effect"
import { Schedule } from "../definition"

/**
 * A schedule that recurs as long as the effectful condition holds, collecting
 * all inputs into a list.
 *
 * @tsplus static ets/ScheduleOps collectWhileEffect
 */
export function collectWhileEffect<Env, A>(
  f: (a: A) => RIO<Env, boolean>
): Schedule.WithState<Tuple<[void, Chunk<A>]>, Env, A, Chunk<A>> {
  return Schedule.recurWhileEffect(f).collectAll()
}
