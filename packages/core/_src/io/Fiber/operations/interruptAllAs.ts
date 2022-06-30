/**
 * Interrupts all fibers as by the specified fiber, awaiting their
 * interruption.
 *
 * @tsplus static effect/core/io/Fiber.Ops interruptAllAs
 */
export function interruptAllAs(
  fibers: Collection<Fiber<any, any>>,
  fiberId: FiberId,
  __tsplusTrace?: string
): Effect<never, never, void> {
  return fibers.reduce(Effect.unit, (io, fiber) => io.zipLeft(fiber.interruptAs(fiberId)))
}
