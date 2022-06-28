/**
 * Determines whether all elements of the `Collection<A>` satisfies the effectual
 * predicate `f`.
 *
 * @tsplus static effect/core/io/Effect.Ops forAll
 */
export function forAll<R, E, A>(
  as: LazyArg<Collection<A>>,
  f: (a: A) => Effect<R, E, boolean>,
  __tsplusTrace?: string
): Effect<R, E, boolean> {
  return Effect.succeed(as).flatMap((Collection) => loop(Collection[Symbol.iterator](), f))
}

function loop<R, E, A>(
  iterator: Iterator<A>,
  f: (a: A) => Effect<R, E, boolean>,
  __tsplusTrace?: string
): Effect<R, E, boolean> {
  const next = iterator.next()
  return next.done
    ? Effect.succeedNow(true)
    : f(next.value).flatMap((b) => b ? Effect.suspendSucceed(loop(iterator, f)) : Effect.succeedNow(b))
}
