/**
 * Returns information about the current fiber, such as its identity.
 *
 * @tsplus static effect/core/io/Effect.Ops descriptor
 * @category getter
 * @since 1.0.0
 */
export const descriptor: Effect<never, never, Fiber.Descriptor> = Effect.descriptorWith(
  Effect.succeed
)
