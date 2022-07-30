/**
 * Folds an `Collection<A>` using an effectual function f, working sequentially from left to right.
 *
 * @tsplus static effect/core/io/Effect.Ops reduceRight
 */
export function reduceRight_<A, Z, R, E>(
  as: LazyArg<Collection<A>>,
  z: LazyArg<Z>,
  f: (a: A, z: Z) => Effect<R, E, Z>,
  __tsplusTrace?: string
): Effect<R, E, Z> {
  return Effect.suspendSucceed(
    Chunk.from(as()).reduceRight(Effect.sync(z) as Effect<R, E, Z>, (el, acc) => acc.flatMap((a) => f(el, a)))
  )
}
