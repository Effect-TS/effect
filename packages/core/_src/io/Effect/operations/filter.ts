/**
 * Filters the collection using the specified effectual predicate.
 *
 * @tsplus static effect/core/io/Effect.Ops filter
 */
export function filter<A, R, E>(
  as: LazyArg<Collection<A>>,
  f: (a: A) => Effect<R, E, boolean>
): Effect<R, E, Chunk<A>> {
  return Effect.suspendSucceed(() =>
    as().reduce(
      Effect.sync(Chunk.empty<A>()) as Effect<R, E, Chunk<A>>,
      (io, a) => io.zipWith(Effect.suspendSucceed(f(a)), (acc, b) => (b ? acc.append(a) : acc))
    )
  )
}
