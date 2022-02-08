import type { RIO } from "../../Effect"
import type { Schedule } from "../definition"

/**
 * Returns a new schedule that continues until the specified effectful
 * predicate on the output evaluates to true.
 *
 * @tsplus fluent ets/Schedule untilOutputEffect
 * @tsplus fluent ets/ScheduleWithState untilOutputEffect
 */
export function untilOutputEffect_<State, Env, In, Out, Env1>(
  self: Schedule.WithState<State, Env, In, Out>,
  f: (out: Out) => RIO<Env1, boolean>
): Schedule.WithState<State, Env & Env1, In, Out> {
  return self.checkEffect((_, out) => f(out).negate())
}

/**
 * Returns a new schedule that continues until the specified effectful
 * predicate on the output evaluates to true.
 *
 * @ets_data_first untilOutputEffect_
 */
export function untilOutputEffect<Env1, Out>(f: (out: Out) => RIO<Env1, boolean>) {
  return <State, Env, In>(
    self: Schedule.WithState<State, Env, In, Out>
  ): Schedule.WithState<State, Env & Env1, In, Out> => self.untilOutputEffect(f)
}
