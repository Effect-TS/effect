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
    makeWithState(self.initial, (now, input, state) =>
      self
        .step(now, input, state)
        .flatMap(({ tuple: [state, out, decision] }) => {
          switch (decision._tag) {
            case "Done": {
              return Effect.succeed(Tuple(state, out, Decision.Done))
            }
            case "Continue": {
              return test(input, out).map((cont) => {
                if (cont) {
                  return Tuple(state, out, decision)
                }
                return Tuple(state, out, Decision.Done)
              })
            }
          }
        }))
}
