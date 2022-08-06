/**
 * Folds an `Collection<A>` using an effectual function f, working sequentially
 * from left to right.
 *
 * @tsplus static effect/core/stm/STM.Ops reduce
 */
export function reduce<A, Z, R, E>(
  as: LazyArg<Collection<A>>,
  z: LazyArg<Z>,
  f: (z: Z, a: A) => STM<R, E, Z>
): STM<R, E, Z> {
  return STM.suspend(
    as().reduce(STM.sync(z) as STM<R, E, Z>, (acc, el) => acc.flatMap((a) => f(a, el)))
  )
}
