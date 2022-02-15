import type { Tuple } from "../../../collection/immutable/Tuple"
import type { Either } from "../../../data/Either"
import { Schedule } from "../definition"

/**
 * Returns a new schedule that makes this schedule available on the `Left`
 * side of an `Either` input, allowing propagating some type `X` through this
 * channel on demand.
 *
 * @tsplus fluent ets/Schedule left
 * @tsplus fluent ets/ScheduleWithState left
 */
export function left<State, Env, In, Out, X>(
  self: Schedule.WithState<State, Env, In, Out>
): Schedule.WithState<Tuple<[State, void]>, Env, Either<In, X>, Either<Out, X>> {
  return self + Schedule.identity<X>()
}
