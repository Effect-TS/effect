/**
 * Returns a new schedule that folds over the outputs of this one.
 *
 * @tsplus static effect/core/io/Schedule.Aspects fold
 * @tsplus pipeable effect/core/io/Schedule fold
 * @category folding
 * @since 1.0.0
 */
export function fold<Out, Z>(z: Z, f: (z: Z, out: Out) => Z) {
  return <State, Env, In>(
    self: Schedule<State, Env, In, Out>
  ): Schedule<readonly [State, Z], Env, In, Z> =>
    self.foldEffect(z, (z, out) => Effect.sync(f(z, out)))
}
