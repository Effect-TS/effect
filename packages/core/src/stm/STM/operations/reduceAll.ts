/**
 * Reduces an `Collection<STM<R, E, A>>` to a single `STM<R, E, A>`, working
 * sequentially.
 *
 * @tsplus static effect/core/stm/STM.Ops reduceAll
 * @category constructors
 * @since 1.0.0
 */
export function reduceAll<R, E, A>(
  zero: STM<R, E, A>,
  as: Iterable<STM<R, E, A>>,
  f: (acc: A, a: A) => A
): STM<R, E, A> {
  return STM.suspend(Array.from(as).reduce((acc, a) => acc.zipWith(a, f), zero))
}
