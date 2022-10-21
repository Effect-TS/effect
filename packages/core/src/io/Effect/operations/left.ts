/**
 * "Zooms in" on the value in the `Left` side of an `Either`, moving the
 * possibility that the value is a `Right` to the error channel.
 *
 * @tsplus getter effect/core/io/Effect left
 */
export function left<R, E, A, B>(self: Effect<R, E, Either<A, B>>): Effect<R, Either<E, B>, A> {
  return self.foldEffect(
    (e) => Effect.fail(Either.left(e)),
    (either) => either.fold(Effect.succeed, (b) => Effect.fail(Either.right(b)))
  )
}
