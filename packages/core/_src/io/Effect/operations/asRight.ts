/**
 * Maps the success value of this effect to a right value.
 *
 * @tsplus getter effect/core/io/Effect asRight
 */
export function asRight<R, E, A>(self: Effect<R, E, A>): Effect<R, E, Either<never, A>> {
  return self.map(Either.right)
}
