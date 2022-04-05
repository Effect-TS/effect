/**
 * Interrupts all fibers, awaiting their interruption.
 *
 * @tsplus static ets/Fiber/Ops interruptAll
 */
export function interruptAll(
  fibers: Collection<Fiber<any, any>>,
  __tsplusTrace?: string
): UIO<void> {
  return Effect.fiberId.flatMap((fiberId) => Fiber.interruptAllAs(fibers, fiberId));
}
