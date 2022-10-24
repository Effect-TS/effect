/**
 * Lifts an `Effect` into a `Fiber`.
 *
 * @tsplus static effect/core/io/Fiber.Ops fromEffect
 * @category conversions
 * @since 1.0.0
 */
export function fromEffect<E, A>(
  effect: Effect<never, E, A>
): Effect<never, never, Fiber<E, A>> {
  return effect.exit.map(Fiber.done)
}
