/**
 * Lifts an `Effect` into a `Fiber`.
 *
 * @tsplus static ets/Fiber/Ops fromEffect
 */
export function fromEffect<E, A>(
  effect: Effect.IO<E, A>,
  __tsplusTrace?: string
): Effect<never, never, Fiber<E, A>> {
  return effect.exit().map(Fiber.done)
}
