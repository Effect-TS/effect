/**
 * Converts a `Effect<R, Either<E, B>, A>` into a `Effect<R, E, Either<A, B>>`.
 * The inverse of `left`.
 *
 * @tsplus getter effect/core/io/Effect unleft
 */
export function unleft<R, E, B, A>(
  self: Effect<R, Either<E, B>, A>,
  __tsplusTrace?: string
): Effect<R, E, Either<A, B>> {
  return self.foldEffect(
    (either) => either.fold(Effect.fail, (b) => Effect.succeed(Either.right(b))),
    (a) => Effect.succeed(Either.left(a))
  )
}
