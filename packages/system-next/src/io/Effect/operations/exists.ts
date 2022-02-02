import type { LazyArg } from "../../../data/Function"
import { Effect } from "../definition"

/**
 * Determines whether any element of the `Iterable<A>` satisfies the effectual
 * predicate `f`.
 *
 * @tsplus static ets/EffectOps exists
 */
export function exists<R, E, A>(
  as: LazyArg<Iterable<A>>,
  f: (a: A) => Effect<R, E, boolean>,
  __etsTrace?: string
): Effect<R, E, boolean> {
  return Effect.succeed(as).flatMap((iterable) => loop(iterable[Symbol.iterator](), f))
}

function loop<R, E, A>(
  iterator: Iterator<A>,
  f: (a: A) => Effect<R, E, boolean>,
  __etsTrace?: string
): Effect<R, E, boolean> {
  const next = iterator.next()
  if (next.done) {
    return Effect.succeedNow(false)
  }
  return f(next.value).flatMap((b) =>
    b ? Effect.succeedNow(b) : Effect.suspendSucceed(loop(iterator, f))
  )
}
