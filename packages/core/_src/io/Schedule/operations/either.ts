import type { MergeTuple } from "@tsplus/stdlib/data/Tuple";

/**
 * Returns a new schedule that performs a geometric union on the intervals
 * defined by both schedules.
 *
 * @tsplus operator ets/Schedule |
 * @tsplus operator ets/Schedule/WithState |
 * @tsplus fluent ets/Schedule either
 * @tsplus fluent ets/Schedule/WithState either
 */
export function either_<State, Env, In, Out, State1, Env1, In1, Out2>(
  self: Schedule<State, Env, In, Out>,
  that: Schedule<State1, Env1, In1, Out2>
): Schedule<
  Tuple<[State, State1]>,
  Env & Env1,
  In & In1,
  MergeTuple<Out, Out2>
> {
  return self.unionWith(that, (l, r) => l.union(r).getOrElse(l.min(r)));
}

/**
 * Returns a new schedule that performs a geometric union on the intervals
 * defined by both schedules.
 *
 * @tsplus static ets/Schedule/Aspects either
 */
export const either = Pipeable(either_);
