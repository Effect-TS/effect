import * as Option from "@fp-ts/data/Option"

/**
 * Returns a successful effect with the head of the collection if the collection
 * is non-empty, or fails with the error `None` if the collection is empty.
 *
 * @tsplus getter effect/core/io/Effect head
 * @category getters
 * @since 1.0.0
 */
export function head<R, E, A>(self: Effect<R, E, Iterable<A>>): Effect<R, Option.Option<E>, A> {
  return self.foldEffect(
    (e) => Effect.fail(Option.some(e)),
    (as) => {
      const array = Array.from(as)
      if (array.length === 0) {
        return Effect.fail(Option.none)
      }
      return Effect.succeed(array[0]!)
    }
  )
}
