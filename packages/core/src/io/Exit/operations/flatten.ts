/**
 * Flattens an `Exit` of an `Exit` into a single `Exit` value.
 *
 * @tsplus getter effect/core/io/Exit flatten
 */
export function flatten<E, E1, A>(self: Exit<E, Exit<E1, A>>): Exit<E | E1, A> {
  return self.flatMap(identity)
}
