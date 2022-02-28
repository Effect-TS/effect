import type { LazyArg } from "../../../data/Function"
import { Sync } from "../definition"

/**
 * Applies the function `f` to each element of the `Iterable<A>` and runs
 * produced Syncs sequentially.
 *
 * Equivalent to `asUnit(forEach(as, f))`, but without the cost of building
 * the list of results.
 *
 * @tsplus static ets/SyncOps forEachDiscard
 */
export function forEachDiscard<R, E, A, X>(
  as: LazyArg<Iterable<A>>,
  f: (a: A) => Sync<R, E, X>,
  __tsplusTrace?: string
): Sync<R, E, void> {
  return Sync.succeed(as).flatMap((iterable) =>
    Sync.suspend(loop(iterable[Symbol.iterator](), f))
  )
}

function loop<R, E, A, X>(
  iterator: Iterator<A, any, undefined>,
  f: (a: A) => Sync<R, E, X>,
  __tsplusTrace?: string
): Sync<R, E, void> {
  const next = iterator.next()
  return next.done ? Sync.unit : f(next.value) > loop(iterator, f)
}
