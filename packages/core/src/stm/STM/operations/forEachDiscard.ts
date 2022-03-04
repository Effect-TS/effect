import type { LazyArg } from "../../../data/Function"
import { STM } from "../definition"

/**
 * Applies the function `f` to each element of the `Iterable<A>` and runs
 * produced effects sequentially.
 *
 * Equivalent to `asUnit(forEach(as, f))`, but without the cost of building
 * the list of results.
 *
 * @tsplus static ets/STMOps forEachDiscard
 */
export function forEachDiscard<R, E, A, X>(
  as: LazyArg<Iterable<A>>,
  f: (a: A) => STM<R, E, X>
): STM<R, E, void> {
  return STM.succeed(as).flatMap((iterable) => loop(iterable[Symbol.iterator](), f))
}

function loop<R, E, A, X>(
  iterator: Iterator<A, any, undefined>,
  f: (a: A) => STM<R, E, X>
): STM<R, E, void> {
  const next = iterator.next()
  return next.done ? STM.unit : f(next.value) > loop(iterator, f)
}
