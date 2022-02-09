import { Chunk } from "../../../collection/immutable/Chunk"
import type { Tuple } from "../../../collection/immutable/Tuple"
import type { Schedule } from "../definition"

/**
 * Returns a new schedule that collects the outputs of this one into a chunk.
 *
 * @tsplus fluent ets/Schedule collectAll
 * @tsplus fluent ets/ScheduleWithState collectAll
 */
export function collectAllFrom<State, Env, In, Out>(
  self: Schedule.WithState<State, Env, In, Out>
): Schedule.WithState<Tuple<[State, Chunk<Out>]>, Env, In, Chunk<Out>> {
  return self.fold(Chunk.empty(), (xs, x) => xs.append(x))
}
