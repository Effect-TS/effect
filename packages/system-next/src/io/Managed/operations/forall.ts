import type { LazyArg } from "../../../data/Function"
import { Managed } from "../definition"

/**
 * Determines whether all elements of the `Iterable<A>` satisfy the effectual
 * predicate `f`.
 *
 * @tsplus static ets/ManagedOps forall
 */
export function forall<R, E, A>(
  as: LazyArg<Iterable<A>>,
  f: (a: A) => Managed<R, E, boolean>,
  __etsTrace?: string
): Managed<R, E, boolean> {
  return Managed.succeed(as[Symbol.iterator]()).flatMap((iterator) => loop(iterator, f))
}

function loop<R, E, A>(
  iterator: Iterator<A>,
  f: (a: A) => Managed<R, E, boolean>,
  __etsTrace?: string
): Managed<R, E, boolean> {
  const next = iterator.next()
  if (next.done) {
    return Managed.succeedNow(false)
  }
  return f(next.value).flatMap((b) =>
    b ? Managed.suspend(loop(iterator, f)) : Managed.succeedNow(b)
  )
}
