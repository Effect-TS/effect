import type { MergeTuple } from "../../../collection/immutable/Tuple"
import { Tuple } from "../../../collection/immutable/Tuple"
import { Effect } from "../../Effect"
import { Decision } from "../Decision"
import type { Schedule } from "../definition"
import type { Interval } from "../Interval"
import { makeWithState } from "./_internal/makeWithState"

/**
 * Returns a new schedule that combines this schedule with the specified
 * schedule, continuing as long as both schedules want to continue and merging
 * the next intervals according to the specified merge function.
 *
 * @tsplus fluent ets/Schedule intersectWith
 * @tsplus fluent ets/ScheduleWithState intersectWith
 */
export function intersectWith_<State, State1, Env, In, Out, Env1, In1, Out2>(
  self: Schedule.WithState<State, Env, In, Out>,
  that: Schedule.WithState<State1, Env1, In1, Out2>,
  f: (x: Interval, y: Interval) => Interval
): Schedule.WithState<
  Tuple<[State, State1]>,
  Env & Env1,
  In & In1,
  MergeTuple<Out, Out2>
> {
  return makeWithState(Tuple(self._initial, that._initial), (now, input, state) => {
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
            : Effect.succeedNow(
                Tuple(Tuple(lState, rState), Tuple.mergeTuple(out, out2), Decision.Done)
              )
      )
  })
}

/**
 * Returns a new schedule that combines this schedule with the specified
 * schedule, continuing as long as both schedules want to continue and merging
 * the next intervals according to the specified merge function.
 *
 * @ets_data_first intersectWith_
 */
export function intersectWith<State1, Env1, In1, Out2>(
  that: Schedule.WithState<State1, Env1, In1, Out2>,
  f: (x: Interval, y: Interval) => Interval
) {
  return <State, Env, In, Out>(
    self: Schedule.WithState<State, Env, In, Out>
  ): Schedule.WithState<
    Tuple<[State, State1]>,
    Env & Env1,
    In & In1,
    MergeTuple<Out, Out2>
  > => self.intersectWith(that, f)
}

function intersectWithLoop<State, State1, Env, In, Out, Env1, In1, Out2>(
  self: Schedule.WithState<State, Env, In, Out>,
  that: Schedule.WithState<State1, Env1, In1, Out2>,
  input: In & In1,
  lState: State,
  out: Out,
  lInterval: Interval,
  rState: State1,
  out2: Out2,
  rInterval: Interval,
  f: (x: Interval, y: Interval) => Interval,
  __etsTrace?: string
): Effect<
  Env & Env1,
  never,
  Tuple<[Tuple<[State, State1]>, MergeTuple<Out, Out2>, Decision]>
> {
  const combined = f(lInterval, rInterval)

  if (combined.isNonEmpty()) {
    return Effect.succeedNow(
      Tuple(
        Tuple(lState, rState),
        Tuple.mergeTuple(out, out2),
        Decision.Continue(combined)
      )
    )
  }

  if (lInterval < rInterval) {
    return self
      ._step(lInterval.endMilliseconds, input, lState)
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
          : Effect.succeedNow(
              Tuple(
                Tuple(lState as State, rState),
                Tuple.mergeTuple(out, out2),
                Decision.Done
              )
            )
      )
  }

  return that
    ._step(rInterval.endMilliseconds, input, rState)
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
        : Effect.succeedNow(
            Tuple(
              Tuple(lState, rState as State1),
              Tuple.mergeTuple(out, out2),
              Decision.Done
            )
          )
    )
}
