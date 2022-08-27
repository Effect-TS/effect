/**
 * Folds an `Collection<A>` using an effectual function f, working sequentially from left to right.
 *
 * @tsplus static effect/core/io/Effect.Ops reduce
 */
export function reduce<A, Z, R, E>(
  as: Collection<A>,
  z: Z,
  f: (z: Z, a: A) => Effect<R, E, Z>
): Effect<R, E, Z> {
  return as.reduce(Effect.succeed(z) as Effect<R, E, Z>, (acc, el) => acc.flatMap((a) => f(a, el)))
}
