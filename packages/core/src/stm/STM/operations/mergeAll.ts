/**
 * Merges an `Collection<STM<R, E, A>>` to a single `STM<R, E, B>`, working
 * sequentially.
 *
 * @tsplus static effect/core/stm/STM.Ops mergeAll
 * @category constructors
 * @since 1.0.0
 */
export function mergeAll<R, E, A, B>(
  as: Iterable<STM<R, E, A>>,
  zero: B,
  f: (b: B, a: A) => B
): STM<R, E, B> {
  return STM.suspend(
    Array.from(as).reduce(
      (acc, a) => acc.zipWith(a, f),
      STM.succeed(zero) as STM<R, E, B>
    )
  )
}
