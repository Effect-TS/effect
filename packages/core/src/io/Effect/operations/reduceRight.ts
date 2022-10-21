/**
 * Folds an `Collection<A>` using an effectual function f, working sequentially from left to right.
 *
 * @tsplus static effect/core/io/Effect.Ops reduceRight
 */
export function reduceRight_<A, Z, R, E>(
  as: Collection<A>,
  z: Z,
  f: (a: A, z: Z) => Effect<R, E, Z>
): Effect<R, E, Z> {
  return Chunk.from(as).reduceRight(
    Effect.succeed(z) as Effect<R, E, Z>,
    (el, acc) => acc.flatMap((a) => f(el, a))
  )
}
