import { Decision } from "@effect-ts/core/io/Schedule/Decision";
import { makeWithState } from "@effect-ts/core/io/Schedule/operations/_internal/makeWithState";

/**
 * Returns a new schedule that passes each input and output of this schedule
 * to the specified function, and then determines whether or not to continue
 * based on the return value of the function.
 *
 * @tsplus fluent ets/Schedule checkEffect
 * @tsplus fluent ets/Schedule/WithState checkEffect
 */
export function checkEffect_<State, Env, In, Out, Env1>(
  self: Schedule.WithState<State, Env, In, Out>,
  test: (input: In, output: Out) => RIO<Env1, boolean>
): Schedule.WithState<State, Env & Env1, In, Out> {
  return makeWithState(self._initial, (now, input, state) =>
    self
      ._step(now, input, state)
      .flatMap(({ tuple: [state, out, decision] }) =>
        decision._tag === "Done"
          ? Effect.succeedNow(Tuple(state, out, Decision.Done))
          : test(input, out).map((b) =>
            b
              ? Tuple(state, out, Decision.Continue(decision.interval))
              : Tuple(state, out, Decision.Done)
          )
      ));
}

/**
 * Returns a new schedule that passes each input and output of this schedule
 * to the specified function, and then determines whether or not to continue
 * based on the return value of the function.
 *
 * @tsplus static ets/Schedule/Aspects checkEffect
 */
export const checkEffect = Pipeable(checkEffect_);
