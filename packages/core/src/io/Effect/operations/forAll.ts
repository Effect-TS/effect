import type { LazyArg } from "../../../data/Function"
import { Effect } from "../definition"

/**
 * Determines whether all elements of the `Iterable<A>` satisfies the effectual
 * predicate `f`.
 *
 * @tsplus static ets/EffectOps forAll
 */
export function forAll<R, E, A>(
  as: LazyArg<Iterable<A>>,
  f: (a: A) => Effect<R, E, boolean>,
  __tsplusTrace?: string
): Effect<R, E, boolean> {
  return Effect.succeed(as).flatMap((iterable) => loop(iterable[Symbol.iterator](), f))
}

function loop<R, E, A>(
  iterator: Iterator<A>,
  f: (a: A) => Effect<R, E, boolean>,
  __tsplusTrace?: string
): Effect<R, E, boolean> {
  const next = iterator.next()
  return next.done
    ? Effect.succeedNow(true)
    : f(next.value).flatMap((b) =>
        b ? Effect.suspendSucceed(loop(iterator, f)) : Effect.succeedNow(b)
      )
}
