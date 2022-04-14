/**
 * Lifts an `Effect` into a `Fiber`.
 *
 * @tsplus static ets/Fiber/Ops fromEffect
 */
export function fromEffect<E, A>(
  effect: Effect.IO<E, A>,
  __tsplusTrace?: string
): Effect.UIO<Fiber<E, A>> {
  return effect.exit().map(Fiber.done);
}
