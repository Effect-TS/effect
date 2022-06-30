/**
 * Returns a new schedule that folds over the outputs of this one.
 *
 * @tsplus static effect/core/io/Schedule.Aspects fold
 * @tsplus pipeable effect/core/io/Schedule fold
 */
export function fold<Out, Z>(z: Z, f: (z: Z, out: Out) => Z) {
  return <State, Env, In>(self: Schedule<State, Env, In, Out>): Schedule<Tuple<[State, Z]>, Env, In, Z> =>
    self.foldEffect(z, (z, out) => Effect.succeed(f(z, out)))
}
