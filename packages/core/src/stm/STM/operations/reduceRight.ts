/**
 * Folds an `Iterable<A>` using an effectual function f, working sequentially from left to right.
 *
 * @tsplus static effect/core/stm/STM.Ops reduceRight
 * @category constructors
 * @since 1.0.0
 */
export function reduceRight_<A, Z, R, E>(
  as: Iterable<A>,
  z: Z,
  f: (a: A, z: Z) => STM<R, E, Z>
): STM<R, E, Z> {
  return STM.suspend(
    Array.from(as).reduceRight(
      (acc, el) => acc.flatMap((a) => f(el, a)),
      STM.succeed(z) as STM<R, E, Z>
    )
  )
}
