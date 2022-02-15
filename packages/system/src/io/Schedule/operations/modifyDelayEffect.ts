import { Tuple } from "../../../collection/immutable/Tuple"
import type { Duration } from "../../../data/Duration"
import type { RIO } from "../../Effect"
import { Effect } from "../../Effect"
import { Decision } from "../Decision"
import type { Schedule } from "../definition"
import { Interval } from "../Interval"
import { makeWithState } from "./_internal/makeWithState"

/**
 * Returns a new schedule that modifies the delay using the specified
 * effectual function.
 *
 * @tsplus fluent ets/Schedule modifyDelayEffect
 * @tsplus fluent ets/ScheduleWithState modifyDelayEffect
 */
export function modifyDelayEffect_<State, Env, In, Out, Env1>(
  self: Schedule.WithState<State, Env, In, Out>,
  f: (out: Out, duration: Duration) => RIO<Env1, Duration>
): Schedule.WithState<State, Env & Env1, In, Out> {
  return makeWithState(self._initial, (now, input, state) =>
    self._step(now, input, state).flatMap(({ tuple: [state, out, decision] }) => {
      if (decision._tag === "Done") {
        return Effect.succeedNow(Tuple(state, out, decision))
      }

      const delay = Interval(now, decision.interval.startMilliseconds).size

      return f(out, delay).map((duration) => {
        const oldStart = decision.interval.startMilliseconds
        const newStart = now + duration.milliseconds
        const delta = newStart - oldStart
        const newEnd = decision.interval.endMilliseconds + delta
        const newInterval = Interval(newStart, newEnd)
        return Tuple(state, out, Decision.Continue(newInterval))
      })
    })
  )
}

export function modifyDelayEffect<Env1, Out>(
  f: (out: Out, duration: Duration) => RIO<Env1, Duration>
) {
  return <State, Env, In>(
    self: Schedule.WithState<State, Env, In, Out>
  ): Schedule.WithState<State, Env & Env1, In, Out> => self.modifyDelayEffect(f)
}
