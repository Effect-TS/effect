import { Decision } from "@effect/core/io/Schedule/Decision"
import { makeWithState } from "@effect/core/io/Schedule/operations/_internal/makeWithState"

/**
 * Returns a new schedule that first executes this schedule to completion, and
 * then executes the specified schedule to completion.
 *
 * @tsplus operator ets/Schedule %
 * @tsplus operator ets/Schedule/WithState %
 * @tsplus fluent ets/Schedule andThenEither
 * @tsplus fluent ets/Schedule/WithState andThenEither
 */
export function andThenEither_<State, Env, In, Out, State1, Env1, In1, Out2>(
  self: Schedule<State, Env, In, Out>,
  that: Schedule<State1, Env1, In1, Out2>
): Schedule<
  Tuple<[State, State1, boolean]>,
  Env | Env1,
  In & In1,
  Either<Out, Out2>
> {
  return makeWithState<Tuple<[State, State1, boolean]>, Env | Env1, In & In1, Either<Out, Out2>>(
    Tuple(self._initial, that._initial, true),
    (now, input, state) =>
      state.get(2)
        ? self
          ._step(now, input, state.get(0))
          .flatMap((
            { tuple: [lState, out, decision] }
          ): Effect<Env | Env1, never, Tuple<[Tuple<[State, State1, boolean]>, Either<Out, Out2>, Decision]>> =>
            decision._tag === "Done"
              ? that
                ._step(now, input, state.get(1))
                .map(({ tuple: [rState, out, decision] }) =>
                  Tuple(Tuple(lState, rState, false), Either.rightW(out), decision)
                )
              : Effect.succeedNow(
                Tuple(
                  Tuple(lState, state.get(1), true),
                  Either.leftW(out),
                  Decision.Continue(decision.interval)
                )
              )
          )
        : that
          ._step(now, input, state.get(1))
          .map(({ tuple: [rState, out, decision] }) =>
            Tuple(Tuple(state.get(0), rState, false), Either.rightW(out), decision)
          )
  )
}

/**
 * Returns a new schedule that first executes this schedule to completion, and
 * then executes the specified schedule to completion.
 *
 * @tsplus static ets/Schedule/Aspects andThenEither
 */
export const andThenEither = Pipeable(andThenEither_)
