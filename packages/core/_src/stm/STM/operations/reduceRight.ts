/**
 * Folds an `Collection<A>` using an effectual function f, working sequentially from left to right.
 *
 * @tsplus static effect/core/stm/STM.Ops reduceRight
 */
export function reduceRight_<A, Z, R, E>(
  as: LazyArg<Collection<A>>,
  z: LazyArg<Z>,
  f: (a: A, z: Z) => STM<R, E, Z>
): STM<R, E, Z> {
  return STM.suspend(
    Chunk.from(as()).reduceRight(
      STM.succeed(z) as STM<R, E, Z>,
      (el, acc) => acc.flatMap((a) => f(el, a))
    )
  )
}
