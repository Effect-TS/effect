/**
 * Returns an effect that performs the outer effect first, followed by the
 * inner effect, yielding the value of the inner effect.
 *
 * This method can be used to "flatten" nested effects.
 *
 * @tsplus static effect/core/io/Effect.Ops flatten
 * @tsplus getter effect/core/io/Effect flatten
 */
export function flatten<R, E, R1, E1, A>(
  self: Effect<R, E, Effect<R1, E1, A>>
): Effect<R | R1, E | E1, A> {
  return self.flatMap(identity)
}
