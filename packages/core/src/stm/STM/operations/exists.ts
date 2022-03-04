import type { LazyArg } from "../../../data/Function"
import { STM } from "../definition"

/**
 * Determines whether any element of the `Iterable<A>` satisfies the effectual
 * predicate `f`.
 *
 * @tsplus static ets/STMOps exists
 */
export function exists<R, E, A>(
  as: LazyArg<Iterable<A>>,
  f: (a: A) => STM<R, E, boolean>
): STM<R, E, boolean> {
  return STM.succeed(as).flatMap((iterable) => loop(iterable[Symbol.iterator](), f))
}

function loop<R, E, A>(
  iterator: Iterator<A>,
  f: (a: A) => STM<R, E, boolean>
): STM<R, E, boolean> {
  const next = iterator.next()
  if (next.done) {
    return STM.succeedNow(false)
  }
  return f(next.value).flatMap((b) =>
    b ? STM.succeedNow(b) : STM.suspend(loop(iterator, f))
  )
}
