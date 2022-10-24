/**
 * Squashes a `Cause` down to a single `Error`, chosen to be the "most
 * important" `Error`.
 *
 * @tsplus getter effect/core/io/Cause squash
 * @category destructors
 * @since 1.0.0
 */
export function squash<E>(self: Cause<E>): Error {
  return self.squashWith((e) => e instanceof Error) as Error
}
