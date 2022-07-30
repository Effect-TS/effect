import { Decision } from "@effect/core/io/Schedule/Decision"
import type { Interval } from "@effect/core/io/Schedule/Interval"
import { makeWithState } from "@effect/core/io/Schedule/operations/_internal/makeWithState"
import type { MergeTuple } from "@tsplus/stdlib/data/Tuple"

/**
 * Returns a new schedule that combines this schedule with the specified
 * schedule, continuing as long as both schedules want to continue and merging
 * the next intervals according to the specified merge function.
 *
 * @tsplus static effect/core/io/Schedule.Aspects intersectWith
 * @tsplus pipeable effect/core/io/Schedule intersectWith
 */
export function intersectWith<State1, Env1, In1, Out2>(
  that: Schedule<State1, Env1, In1, Out2>,
  f: (x: Interval, y: Interval) => Interval
) {
  return <State, Env, In, Out>(self: Schedule<State, Env, In, Out>): Schedule<
    Tuple<[State, State1]>,
    Env | Env1,
    In & In1,
    MergeTuple<Out, Out2>
  > =>
    makeWithState(Tuple(self._initial, that._initial), (now, input, state) => {
      const left = self._step(now, input, state.get(0))
      const right = that._step(now, input, state.get(1))

      return left
        .zipWith(right, (a, b) => Tuple(a, b))
        .flatMap(
          ({
            tuple: [
              {
                tuple: [lState, out, lDecision]
              },
              {
                tuple: [rState, out2, rDecision]
              }
            ]
          }) =>
            lDecision._tag === "Continue" && rDecision._tag === "Continue"
              ? intersectWithLoop(
                self,
                that,
                input,
                lState,
                out,
                lDecision.interval,
                rState,
                out2,
                rDecision.interval,
                f
              )
              : Effect.succeed(
                Tuple(Tuple(lState, rState), Tuple.mergeTuple(out, out2), Decision.Done)
              )
        )
    })
}

function intersectWithLoop<State, State1, Env, In, Out, Env1, In1, Out2>(
  self: Schedule<State, Env, In, Out>,
  that: Schedule<State1, Env1, In1, Out2>,
  input: In & In1,
  lState: State,
  out: Out,
  lInterval: Interval,
  rState: State1,
  out2: Out2,
  rInterval: Interval,
  f: (x: Interval, y: Interval) => Interval,
  __tsplusTrace?: string
): Effect<
  Env | Env1,
  never,
  Tuple<[Tuple<[State, State1]>, MergeTuple<Out, Out2>, Decision]>
> {
  const combined = f(lInterval, rInterval)

  if (combined.isNonEmpty) {
    return Effect.succeed(
      Tuple(
        Tuple(lState, rState),
        Tuple.mergeTuple(out, out2),
        Decision.Continue(combined)
      )
    )
  }

  if (lInterval < rInterval) {
    return self
      ._step(lInterval.endMillis, input, lState)
      .flatMap(({ tuple: [lState, out, decision] }) =>
        decision._tag === "Continue"
          ? intersectWithLoop(
            self,
            that,
            input,
            lState as State,
            out,
            decision.interval,
            rState,
            out2,
            rInterval,
            f
          )
          : Effect.succeed(
            Tuple(
              Tuple(lState as State, rState),
              Tuple.mergeTuple(out, out2),
              Decision.Done
            )
          )
      )
  }

  return that
    ._step(rInterval.endMillis, input, rState)
    .flatMap(({ tuple: [rState, out2, decision] }) =>
      decision._tag === "Continue"
        ? intersectWithLoop(
          self,
          that,
          input,
          lState,
          out,
          lInterval,
          rState as State1,
          out2,
          decision.interval,
          f
        )
        : Effect.succeed(
          Tuple(
            Tuple(lState, rState as State1),
            Tuple.mergeTuple(out, out2),
            Decision.Done
          )
        )
    )
}
