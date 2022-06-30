/**
 * Attempts to convert defects into a failure, throwing away all information
 * about the cause of the failure.
 *
 * @tsplus getter effect/core/io/Effect absorb
 */
export function absorb<R, E, A>(self: Effect<R, E, A>, __tsplusTrace?: string) {
  return self.absorbWith(identity)
}
