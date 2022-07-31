/**
 * Merges an `Collection<STM<R, E, A>>` to a single `STM<R, E, B>`, working
 * sequentially.
 *
 * @tsplus static effect/core/stm/STM.Ops mergeAll
 */
export function mergeAll<R, E, A, B>(
  as: LazyArg<Collection<STM<R, E, A>>>,
  zero: LazyArg<B>,
  f: (b: B, a: A) => B
): STM<R, E, B> {
  return STM.suspend(() =>
    as().reduce(STM.succeed(zero) as STM<R, E, B>, (acc, a) => acc.zipWith(a, f))
  )
}
