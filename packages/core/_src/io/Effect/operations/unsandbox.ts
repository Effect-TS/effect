/**
 * The inverse operation `sandbox(effect)`
 *
 * Terminates with exceptions on the `Left` side of the `Either` error, if it
 * exists. Otherwise extracts the contained `Effect< R, E, A>`
 *
 * @tsplus fluent ets/Effect unsandbox
 */
export function unsandbox<R, E, A>(self: Effect<R, Cause<E>, A>, __tsplusTrace?: string) {
  return self.mapErrorCause((cause) => cause.flatten)
}
