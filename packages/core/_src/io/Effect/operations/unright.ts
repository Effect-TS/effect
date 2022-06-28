/**
 * Converts a `Effect<R, Either<B, E>, A>` into a `Effect<R, E, Either<B, A>>`.
 * The inverse of `right`.
 *
 * @tsplus getter effect/core/io/Effect unright
 */
export function unright<R, B, E, A>(
  self: Effect<R, Either<B, E>, A>,
  __tsplusTrace?: string
): Effect<R, E, Either<B, A>> {
  return self.foldEffect(
    (either) => either.fold((b) => Effect.succeedNow(Either.left(b)), Effect.failNow),
    (a) => Effect.succeedNow(Either.right(a))
  )
}
