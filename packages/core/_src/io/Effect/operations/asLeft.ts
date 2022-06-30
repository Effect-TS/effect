/**
 * Maps the success value of this effect to a left value.
 *
 * @tsplus getter effect/core/io/Effect asLeft
 */
export function asLeft<R, E, A>(
  self: Effect<R, E, A>,
  __tsplusTrace?: string
): Effect<R, E, Either<A, never>> {
  return self.map(Either.left)
}
