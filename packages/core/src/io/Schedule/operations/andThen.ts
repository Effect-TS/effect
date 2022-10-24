import * as Either from "@fp-ts/data/Either"

/**
 * The same as `andThenEither`, but merges the output.
 *
 * @tsplus pipeable-operator effect/core/io/Schedule /
 * @tsplus static effect/core/io/Schedule.Aspects andThen
 * @tsplus pipeable effect/core/io/Schedule andThen
 * @category sequencing
 * @since 1.0.0
 */
export function andThen<State1, Env1, In1, Out2>(
  that: Schedule<State1, Env1, In1, Out2>
) {
  return <State, Env, In, Out>(self: Schedule<State, Env, In, Out>): Schedule<
    readonly [State, State1, boolean],
    Env | Env1,
    In & In1,
    Out | Out2
  > => self.andThenEither(that).map(Either.toUnion)
}
