/**
 * Returns an effect that executes both this effect and the specified effect,
 * in parallel, combining their results with the specified `f` function. If
 * both sides fail, then the cause will be combined.
 *
 * @tsplus fluent ets/Effect validateWithPar
 */
export function validateWithPar_<R, E, A, R1, E1, B, C>(
  self: Effect<R, E, A>,
  that: LazyArg<Effect<R1, E1, B>>,
  f: (a: A, b: B) => C,
  __tsplusTrace?: string
): Effect<R & R1, E | E1, C> {
  return self
    .exit()
    .zipWithPar(that().exit(), (ea, eb) => ea.zipWith(eb, f, (ca, cb) => Cause.both(ca, cb)))
    .flatMap((exit) => Effect.done(exit));
}

/**
 * Returns an effect that executes both this effect and the specified effect,
 * in parallel, combining their results with the specified `f` function. If
 * both sides fail, then the cause will be combined.
 *
 * @tsplus static ets/Effect/Aspects validateWithPar
 */
export const validateWithPar = Pipeable(validateWithPar_);
