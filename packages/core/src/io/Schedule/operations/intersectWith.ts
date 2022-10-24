import { Decision } from "@effect/core/io/Schedule/Decision"
import type { Intervals } from "@effect/core/io/Schedule/Intervals"
import { makeWithState } from "@effect/core/io/Schedule/operations/_internal/makeWithState"

/**
 * Returns a new schedule that combines this schedule with the specified
 * schedule, continuing as long as both schedules want to continue and merging
 * the next intervals according to the specified merge function.
 *
 * @tsplus static effect/core/io/Schedule.Aspects intersectWith
 * @tsplus pipeable effect/core/io/Schedule intersectWith
 * @category mutations
 * @since 1.0.0
 */
export function intersectWith<State1, Env1, In1, Out2>(
  that: Schedule<State1, Env1, In1, Out2>,
  f: (x: Intervals, y: Intervals) => Intervals
) {
  return <State, Env, In, Out>(self: Schedule<State, Env, In, Out>): Schedule<
    readonly [State, State1],
    Env | Env1,
    In & In1,
    readonly [Out, Out2]
  > =>
    makeWithState([self.initial, that.initial] as const, (now, input, state) => {
      const left = self.step(now, input, state[0])
      const right = that.step(now, input, state[1])

      return left
        .zipWith(right, (a, b) => [a, b] as const)
        .flatMap(
          ([
            [lState, out, lDecision],
            [rState, out2, rDecision]
          ]) => {
            if (lDecision._tag === "Continue" && rDecision._tag === "Continue") {
              return intersectWithLoop(
                self,
                that,
                input,
                lState,
                out,
                lDecision.intervals,
                rState,
                out2,
                rDecision.intervals,
                f
              )
            }
            return Effect.succeed(
              [[lState, rState] as const, [out, out2] as const, Decision.Done] as const
            )
          }
        )
    })
}

function intersectWithLoop<State, State1, Env, In, Out, Env1, In1, Out2>(
  self: Schedule<State, Env, In, Out>,
  that: Schedule<State1, Env1, In1, Out2>,
  input: In & In1,
  lState: State,
  out: Out,
  lInterval: Intervals,
  rState: State1,
  out2: Out2,
  rInterval: Intervals,
  f: (x: Intervals, y: Intervals) => Intervals
): Effect<
  Env | Env1,
  never,
  readonly [readonly [State, State1], readonly [Out, Out2], Decision]
> {
  const combined = f(lInterval, rInterval)

  if (combined.isNonEmpty) {
    return Effect.succeed(
      [
        [lState, rState],
        [out, out2],
        Decision.Continue(combined)
      ]
    )
  }

  if (lInterval.lessThan(rInterval)) {
    return self
      .step(lInterval.end, input, lState)
      .flatMap(([lState, out, decision]) => {
        switch (decision._tag) {
          case "Done": {
            return Effect.succeed(
              [
                [lState, rState],
                [out, out2],
                Decision.Done
              ]
            )
          }
          case "Continue": {
            return intersectWithLoop(
              self,
              that,
              input,
              lState,
              out,
              decision.intervals,
              rState,
              out2,
              rInterval,
              f
            )
          }
        }
      })
  }

  return that
    .step(rInterval.end, input, rState)
    .flatMap(([rState, out2, decision]) => {
      switch (decision._tag) {
        case "Done": {
          return Effect.succeed(
            [
              [lState, rState],
              [out, out2],
              Decision.Done
            ]
          )
        }
        case "Continue": {
          return intersectWithLoop(
            self,
            that,
            input,
            lState,
            out,
            lInterval,
            rState,
            out2,
            decision.intervals,
            f
          )
        }
      }
    })
}
