import type { LazyArg } from "../../../data/Function"
import type { Option } from "../../../data/Option"
import { Effect } from "../definition"

/**
 * Collects the first element of the `Iterable<A?` for which the effectual
 * function `f` returns `Some`.
 *
 * @tsplus static ets/EffectOps collectFirst
 */
export function collectFirst<R, E, A, B>(
  as: LazyArg<Iterable<A>>,
  f: (a: A) => Effect<R, E, Option<B>>,
  __etsTrace?: string
): Effect<R, E, Option<B>> {
  return Effect.succeed(as).flatMap((iterable) => loop(iterable[Symbol.iterator](), f))
}

function loop<R, E, A, B>(
  iterator: Iterator<A, any, undefined>,
  f: (a: A) => Effect<R, E, Option<B>>,
  __etsTrace?: string
): Effect<R, E, Option<B>> {
  const next = iterator.next()
  return next.done
    ? Effect.none
    : f(next.value).flatMap((option) => option.fold(loop(iterator, f), Effect.some))
}
