/**
 * Folds an `Iterable<A>` using an effectual function f, working sequentially from left to right.
 *
 * @tsplus static effect/core/io/Effect.Ops reduceRight
 * @category folding
 * @since 1.0.0
 */
export function reduceRight_<A, Z, R, E>(
  as: Iterable<A>,
  z: Z,
  f: (a: A, z: Z) => Effect<R, E, Z>
): Effect<R, E, Z> {
  return Array.from(as).reduceRight(
    (acc, el) => acc.flatMap((a) => f(el, a)),
    Effect.succeed(z) as Effect<R, E, Z>
  )
}
