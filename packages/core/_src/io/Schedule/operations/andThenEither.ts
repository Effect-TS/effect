import type { Decision } from "@effect/core/io/Schedule/Decision"
import { makeWithState } from "@effect/core/io/Schedule/operations/_internal/makeWithState"

/**
 * Returns a new schedule that first executes this schedule to completion, and
 * then executes the specified schedule to completion.
 *
 * @tsplus pipeable-operator effect/core/io/Schedule %
 * @tsplus static effect/core/io/Schedule.Aspects andThenEither
 * @tsplus pipeable effect/core/io/Schedule andThenEither
 */
export function andThenEither<State1, Env1, In1, Out2>(
  that: Schedule<State1, Env1, In1, Out2>
) {
  return <State, Env, In, Out>(self: Schedule<State, Env, In, Out>): Schedule<
    readonly [State, State1, boolean],
    Env | Env1,
    In & In1,
    Either<Out, Out2>
  > =>
    makeWithState<readonly [State, State1, boolean], Env | Env1, In & In1, Either<Out, Out2>>(
      [self.initial, that.initial, true] as const,
      (now, input, state) =>
        state[2]
          ? self
            .step(now, input, state[0])
            .flatMap((
              [lState, out, decision]
            ): Effect<
              Env | Env1,
              never,
              readonly [readonly [State, State1, boolean], Either<Out, Out2>, Decision]
            > => {
              switch (decision._tag) {
                case "Done": {
                  return that
                    .step(now, input, state[1])
                    .map(([rState, out, decision]) =>
                      [[lState, rState, false] as const, Either.rightW(out), decision] as const
                    )
                }
                case "Continue": {
                  return Effect.succeed(
                    [
                      [lState, state[1], true] as const,
                      Either.leftW(out),
                      decision
                    ] as const
                  )
                }
              }
            })
          : that
            .step(now, input, state[1])
            .map(([rState, out, decision]) =>
              [[state[0], rState, false] as const, Either.rightW(out), decision] as const
            )
    )
}
