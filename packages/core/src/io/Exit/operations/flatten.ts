import { identity } from "@fp-ts/data/Function"

/**
 * Flattens an `Exit` of an `Exit` into a single `Exit` value.
 *
 * @tsplus getter effect/core/io/Exit flatten
 * @category sequencing
 * @since 1.0.0
 */
export function flatten<E, E1, A>(self: Exit<E, Exit<E1, A>>): Exit<E | E1, A> {
  return self.flatMap(identity)
}
