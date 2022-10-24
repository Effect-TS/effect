/**
 * Interrupts all fibers, awaiting their interruption.
 *
 * @tsplus static effect/core/io/Fiber.Ops interruptAll
 * @category interruption
 * @since 1.0.0
 */
export function interruptAll(
  fibers: Iterable<Fiber<any, any>>
): Effect<never, never, void> {
  return Effect.fiberId.flatMap((fiberId) => Fiber.interruptAllAs(fibers, fiberId))
}
