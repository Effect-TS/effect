/**
 * Filters the collection using the specified effectual predicate.
 *
 * @tsplus static effect/core/stm/STM.Ops filter
 */
export function filter<A, R, E>(
  as: LazyArg<Collection<A>>,
  f: (a: A) => STM<R, E, boolean>
): STM<R, E, Chunk<A>> {
  return STM.suspend(() =>
    as().reduce(
      STM.succeed(Chunk.empty<A>()) as STM<R, E, Chunk<A>>,
      (io, a) => io.zipWith(STM.suspend(f(a)), (acc, b) => (b ? acc.append(a) : acc))
    )
  )
}
