import { Decision } from "@effect/core/io/Schedule/Decision"
import { Interval } from "@effect/core/io/Schedule/Interval"
import { makeWithState } from "@effect/core/io/Schedule/operations/_internal/makeWithState"

/**
 * Returns a new schedule that modifies the delay using the specified
 * effectual function.
 *
 * @tsplus static effect/core/io/Schedule.Aspects modifyDelayEffect
 * @tsplus pipeable effect/core/io/Schedule modifyDelayEffect
 */
export function modifyDelayEffect<Out, Env1>(
  f: (out: Out, duration: Duration) => Effect<Env1, never, Duration>
) {
  return <State, Env, In>(
    self: Schedule<State, Env, In, Out>
  ): Schedule<State, Env | Env1, In, Out> =>
    makeWithState(
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
