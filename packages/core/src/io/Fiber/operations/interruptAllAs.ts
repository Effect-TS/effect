/**
 * Interrupts all fibers as by the specified fiber, awaiting their
 * interruption.
 *
 * @tsplus static effect/core/io/Fiber.Ops interruptAllAs
 * @category interruption
 * @since 1.0.0
 */
export function interruptAllAs(
  fibers: Iterable<Fiber<any, any>>,
  fiberId: FiberId
): Effect<never, never, void> {
  return Array.from(fibers).reduce(
    (io, fiber) => io.zipLeft(fiber.interruptAs(fiberId)),
    Effect.unit
  )
}
