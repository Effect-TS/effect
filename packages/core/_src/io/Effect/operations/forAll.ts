/**
 * Determines whether all elements of the `Collection<A>` satisfies the effectual
 * predicate `f`.
 *
 * @tsplus static effect/core/io/Effect.Ops forAll
 */
export function forAll<R, E, A>(
  as: Collection<A>,
  f: (a: A) => Effect<R, E, boolean>
): Effect<R, E, boolean> {
  return Effect.suspendSucceed(loop(as[Symbol.iterator](), f))
}

function loop<R, E, A>(
  iterator: Iterator<A>,
  f: (a: A) => Effect<R, E, boolean>
): Effect<R, E, boolean> {
  const next = iterator.next()
  return next.done
    ? Effect.succeed(true)
    : f(next.value).flatMap((b) => b ? Effect.suspendSucceed(loop(iterator, f)) : Effect.succeed(b))
}
