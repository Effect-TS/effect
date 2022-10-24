import { identity } from "@fp-ts/data/Function"

/**
 * Flattens a nested cause.
 *
 * @tsplus getter effect/core/io/Cause flatten
 * @category sequencing
 * @since 1.0.0
 */
export function flatten<E>(self: Cause<Cause<E>>): Cause<E> {
  return self.flatMap(identity)
}
