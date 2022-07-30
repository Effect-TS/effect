/**
 * Determines whether any element of the `Collection<A>` satisfies the effectual
 * predicate `f`.
 *
 * @tsplus static effect/core/io/Effect.Ops exists
 */
export function exists<R, E, A>(
  as: LazyArg<Collection<A>>,
  f: (a: A) => Effect<R, E, boolean>,
  __tsplusTrace?: string
): Effect<R, E, boolean> {
  return Effect.sync(as).flatMap((collection) => loop(collection[Symbol.iterator](), f))
}

function loop<R, E, A>(
  iterator: Iterator<A>,
  f: (a: A) => Effect<R, E, boolean>,
  __tsplusTrace?: string
): Effect<R, E, boolean> {
  const next = iterator.next()
  if (next.done) {
    return Effect.succeed(false)
  }
  return f(next.value).flatMap((b) => b ? Effect.succeed(b) : Effect.suspendSucceed(loop(iterator, f)))
}
