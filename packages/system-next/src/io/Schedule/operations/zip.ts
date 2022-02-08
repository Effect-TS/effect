import type { MergeTuple, Tuple } from "../../../collection/immutable/Tuple"
import type { Schedule } from "../definition"

/**
 * Returns a new schedule that performs a geometric intersection on the
 * intervals defined by both schedules.
 *
 * @tsplus operator ets/Schedule &&
 * @tsplus operator ets/ScheduleWithState &&
 * @tsplus fluent ets/Schedule zip
 * @tsplus fluent ets/ScheduleWithState zip
 */
export function zip_<State, State1, Env, In, Out, Env1, In1, Out2>(
  self: Schedule.WithState<State, Env, In, Out>,
  that: Schedule.WithState<State1, Env1, In1, Out2>
): Schedule.WithState<
  Tuple<[State, State1]>,
  Env & Env1,
  In & In1,
  MergeTuple<Out, Out2>
> {
  return self.intersectWith(that, (a, b) => a.intersect(b))
}

/**

 * Returns a new schedule that performs a geometric intersection on the
 * intervals defined by both schedules.
 *
 * @ets_data_first zip_
 */
export function zip<State1, Env1, In1, Out2>(
  that: Schedule.WithState<State1, Env1, In1, Out2>
) {
  return <State, Env, In, Out>(
    self: Schedule.WithState<State, Env, In, Out>
  ): Schedule.WithState<
    Tuple<[State, State1]>,
    Env & Env1,
    In & In1,
    MergeTuple<Out, Out2>
  > => self && that
}
