import { Decision } from "@effect/core/io/Schedule/Decision"
import { Interval } from "@effect/core/io/Schedule/Interval"
import { makeWithState } from "@effect/core/io/Schedule/operations/_internal/makeWithState"
import type { Duration } from "@fp-ts/data/Duration"

/**
 * Returns a new schedule that modifies the delay using the specified
 * effectual function.
 *
 * @tsplus static effect/core/io/Schedule.Aspects modifyDelayEffect
 * @tsplus pipeable effect/core/io/Schedule modifyDelayEffect
 * @category mutations
 * @since 1.0.0
 */
export function modifyDelayEffect<Out, Env1>(
  f: (out: Out, duration: Duration) => Effect<Env1, never, Duration>
) {
  return <State, Env, In>(
    self: Schedule<State, Env, In, Out>
  ): Schedule<State, Env | Env1, In, Out> =>
    makeWithState(
      self.initial,
      (now, input, state) =>
        self.step(now, input, state).flatMap(([state, out, decision]) => {
          switch (decision._tag) {
            case "Done": {
              return Effect.succeed([state, out, decision] as const)
            }
            case "Continue": {
              const intervals = decision.intervals
              const delay = Interval(now, intervals.start).size
              return f(out, delay).map((duration) => {
                const oldStart = intervals.start
                const newStart = now + duration.millis
                const delta = newStart - oldStart
                const newEnd = Math.min(Math.max(0, intervals.end + delta), Number.MAX_SAFE_INTEGER)
                const newInterval = Interval(newStart, newEnd)
                return [state, out, Decision.continueWith(newInterval)] as const
              })
            }
          }
        })
    )
}
