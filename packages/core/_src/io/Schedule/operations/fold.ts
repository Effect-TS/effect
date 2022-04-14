/**
 * Returns a new schedule that folds over the outputs of this one.
 *
 * @tsplus fluent ets/Schedule fold
 * @tsplus fluent ets/Schedule/WithState fold
 */
export function fold_<State, Env, In, Out, Z>(
  self: Schedule<State, Env, In, Out>,
  z: Z,
  f: (z: Z, out: Out) => Z
): Schedule<Tuple<[State, Z]>, Env, In, Z> {
  return self.foldEffect(z, (z, out) => Effect.succeed(f(z, out)));
}

/**
 * Returns a new schedule that folds over the outputs of this one.
 *
 * @tsplus static ets/Schedule/Aspects fold
 */
export const fold = Pipeable(fold_);
