/**
 * The inverse operation `sandbox(effect)`
 *
 * Terminates with exceptions on the `Left` side of the `Either` error, if it
 * exists. Otherwise extracts the contained `Effect< R, E, A>`
 *
 * @tsplus getter effect/core/io/Effect unsandbox
 * @category mutations
 * @since 1.0.0
 */
export function unsandbox<R, E, A>(self: Effect<R, Cause<E>, A>) {
  return self.mapErrorCause((cause) => cause.flatten)
}
