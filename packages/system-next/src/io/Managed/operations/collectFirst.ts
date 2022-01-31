import type { LazyArg } from "../../../data/Function"
import type { Option } from "../../../data/Option"
import { Managed } from "../definition"

/**
 * Collects the first element of the `Iterable<A>` for which the effectual
 * function `f` returns `Some`.
 *
 * @tsplus static ets/ManagedOps collectFirst
 */
export function collectFirst<R, E, A, B>(
  as: LazyArg<Iterable<A>>,
  f: (a: A) => Managed<R, E, Option<B>>,
  __etsTrace?: string
): Managed<R, E, Option<B>> {
  return Managed.succeed(as[Symbol.iterator]()).flatMap((iterator) => loop(iterator, f))
}

function loop<R, E, A, B>(
  iterator: Iterator<A>,
  f: (a: A) => Managed<R, E, Option<B>>,
  __etsTrace?: string
): Managed<R, E, Option<B>> {
  const next = iterator.next()
  if (next.done) {
    return Managed.none
  }
  return f(next.value).flatMap((_) =>
    _.isNone() ? Managed.suspend(loop(iterator, f)) : Managed.some(_.value)
  )
}
