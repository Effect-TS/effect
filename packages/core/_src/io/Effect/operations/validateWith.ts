/**
 * Sequentially zips this effect with the specified effect using the specified
 * combiner function. Combines the causes in case both effect fail.
 *
 * @tsplus fluent ets/Effect validateWith
 */
export function validateWith_<R, E, A, R1, E1, B, C>(
  self: Effect<R, E, A>,
  that: LazyArg<Effect<R1, E1, B>>,
  f: (a: A, b: B) => C,
  __tsplusTrace?: string
): Effect<R | R1, E | E1, C> {
  return self
    .exit()
    .zipWith(that().exit(), (ea, eb) => ea.zipWith(eb, f, (ca, cb) => Cause.then(ca, cb)))
    .flatMap((exit) => Effect.done(exit))
}

/**
 * Sequentially zips this effect with the specified effect using the specified
 * combiner function. Combines the causes in case both effect fail.
 *
 * @tsplus static ets/Effect/Aspects validateWith
 */
export const validateWith = Pipeable(validateWith_)
