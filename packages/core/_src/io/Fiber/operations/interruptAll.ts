/**
 * Interrupts all fibers, awaiting their interruption.
 *
 * @tsplus static effect/core/io/Fiber.Ops interruptAll
 */
export function interruptAll(
  fibers: Collection<Fiber<any, any>>,
  __tsplusTrace?: string
): Effect<never, never, void> {
  return Effect.fiberId.flatMap((fiberId) => Fiber.interruptAllAs(fibers, fiberId))
}
