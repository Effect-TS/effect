/**
 * Applies the function `f` to each element of the `Collection<A>` and runs
 * produced effects sequentially.
 *
 * Equivalent to `unit(forEach(as, f))`, but without the cost of building
 * the list of results.
 *
 * @tsplus static effect/core/stm/STM.Ops forEachDiscard
 * @category traversing
 * @since 1.0.0
 */
export function forEachDiscard<R, E, A, X>(
  as: Iterable<A>,
  f: (a: A) => STM<R, E, X>
): STM<R, E, void> {
  return STM.suspend(loop(as[Symbol.iterator](), f))
}

function loop<R, E, A, X>(
  iterator: Iterator<A, any, undefined>,
  f: (a: A) => STM<R, E, X>
): STM<R, E, void> {
  const next = iterator.next()
  return next.done ? STM.unit : f(next.value) > loop(iterator, f)
}
