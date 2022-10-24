/**
 * Folds an `Collection<A>` using an effectual function f, working sequentially from left to right.
 *
 * @tsplus static effect/core/io/Effect.Ops reduce
 * @category folding
 * @since 1.0.0
 */
export function reduce<A, Z, R, E>(
  as: Iterable<A>,
  z: Z,
  f: (z: Z, a: A) => Effect<R, E, Z>
): Effect<R, E, Z> {
  return Array.from(as).reduce(
    (acc, el) => acc.flatMap((a) => f(a, el)),
    Effect.succeed(z) as Effect<R, E, Z>
  )
}
