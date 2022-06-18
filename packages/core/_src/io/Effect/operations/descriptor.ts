/**
 * Returns information about the current fiber, such as its identity.
 *
 * @tsplus static ets/Effect/Ops descriptor
 */
export const descriptor: Effect<never, never, Fiber.Descriptor> = Effect.descriptorWith(
  Effect.succeedNow
)
