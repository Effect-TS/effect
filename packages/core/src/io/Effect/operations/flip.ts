/**
 * Returns an effect that swaps the error/success cases. This allows you to
 * use all methods on the error channel, possibly before flipping back.
 *
 * @tsplus getter effect/core/io/Effect flip
 */
export function flip<R, E, A>(self: Effect<R, E, A>): Effect<R, A, E> {
  return self.foldEffect(Effect.succeed, Effect.fail)
}
