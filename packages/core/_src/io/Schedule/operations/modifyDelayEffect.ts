import { Decision } from "@effect/core/io/Schedule/Decision"
import { Interval } from "@effect/core/io/Schedule/Interval"
import { makeWithState } from "@effect/core/io/Schedule/operations/_internal/makeWithState"

/**
 * Returns a new schedule that modifies the delay using the specified
 * effectual function.
 *
 * @tsplus fluent ets/Schedule modifyDelayEffect
 * @tsplus fluent ets/Schedule/WithState modifyDelayEffect
 */
export function modifyDelayEffect_<State, Env, In, Out, Env1>(
  self: Schedule<State, Env, In, Out>,
  f: (out: Out, duration: Duration) => Effect.RIO<Env1, Duration>
): Schedule<State, Env & Env1, In, Out> {
  return makeWithState(
    self._initial,
    (now, input, state) =>
      self._step(now, input, state).flatMap(({ tuple: [state, out, decision] }) => {
        if (decision._tag === "Done") {
          return Effect.succeedNow(Tuple(state, out, decision))
        }

        const delay = Interval(now, decision.interval.startMillis).size

        return f(out, delay).map((duration) => {
          const oldStart = decision.interval.startMillis
          const newStart = now + duration.millis
          const delta = newStart - oldStart
          const newEnd = decision.interval.endMillis + delta
          const newInterval = Interval(newStart, newEnd)
          return Tuple(state, out, Decision.Continue(newInterval))
        })
      })
  )
}

/**
 * Returns a new schedule that modifies the delay using the specified
 * effectual function.
 *
 * @tsplus static ets/Schedule/Aspects modifyDelayEffect
 */
export const modifyDelayEffect = Pipeable(modifyDelayEffect_)
