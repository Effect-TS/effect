/**
 * Returns a successful effect with the head of the collection if the collection
 * is non-empty, or fails with the error `None` if the collection is empty.
 *
 * @tsplus getter effect/core/io/Effect head
 */
export function head<R, E, A>(self: Effect<R, E, Collection<A>>): Effect<R, Maybe<E>, A> {
  return self.foldEffect(
    (e) => Effect.failSync(Maybe.some(e)),
    (collection) => Chunk.from(collection).head.fold(Effect.failSync(Maybe.none), Effect.succeed)
  )
}
