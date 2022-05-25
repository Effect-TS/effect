/**
 * Flattens a nested cause.
 *
 * @tsplus fluent ets/Cause flatten
 */
export function flatten<E>(self: Cause<Cause<E>>): Cause<E> {
  return self.flatMap(identity)
}
