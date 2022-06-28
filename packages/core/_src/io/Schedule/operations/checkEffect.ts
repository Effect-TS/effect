import { Decision } from "@effect/core/io/Schedule/Decision"
import { makeWithState } from "@effect/core/io/Schedule/operations/_internal/makeWithState"

/**
 * Returns a new schedule that passes each input and output of this schedule
 * to the specified function, and then determines whether or not to continue
 * based on the return value of the function.
 *
 * @tsplus static effect/core/io/Schedule.Aspects checkEffect
 * @tsplus pipeable effect/core/io/Schedule checkEffect
 */
export function checkEffect<In, Out, Env1>(
  test: (input: In, output: Out) => Effect<Env1, never, boolean>
) {
  return <State, Env>(
    self: Schedule<State, Env, In, Out>
  ): Schedule<State, Env | Env1, In, Out> =>
    makeWithState(self._initial, (now, input, state) =>
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
        ))
}
