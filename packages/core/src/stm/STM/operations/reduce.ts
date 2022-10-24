/**
 * Folds an `Collection<A>` using an effectual function f, working sequentially
 * from left to right.
 *
 * @tsplus static effect/core/stm/STM.Ops reduce
 * @category constructors
 * @since 1.0.0
 */
export function reduce<A, Z, R, E>(
  as: Iterable<A>,
  z: Z,
  f: (z: Z, a: A) => STM<R, E, Z>
): STM<R, E, Z> {
  return STM.suspend(
    Array.from(as).reduce(
      (acc, el) => acc.flatMap((a) => f(a, el)),
      STM.succeed(z) as STM<R, E, Z>
    )
  )
}
