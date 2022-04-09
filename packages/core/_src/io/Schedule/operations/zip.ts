import type { MergeTuple } from "@tsplus/stdlib/data/Tuple";

/**
 * Returns a new schedule that performs a geometric intersection on the
 * intervals defined by both schedules.
 *
 * @tsplus operator ets/Schedule &&
 * @tsplus operator ets/Schedule/WithState &&
 * @tsplus fluent ets/Schedule zip
 * @tsplus fluent ets/Schedule/WithState zip
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
  return self.intersectWith(that, (a, b) => a.intersect(b));
}

/**

 * Returns a new schedule that performs a geometric intersection on the
 * intervals defined by both schedules.
 *
 * @tsplus static ets/Schedule/Aspects zip
 */
export const zip = Pipeable(zip_);
