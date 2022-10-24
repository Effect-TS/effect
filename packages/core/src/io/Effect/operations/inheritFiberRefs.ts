/**
 * Inherits values from all [[FiberRef]] instances into current fiber.
 *
 * @tsplus static effect/core/io/Effect.Ops inheritFiberRefs
 * @category mutations
 * @since 1.0.0
 */
export function inheritFiberRefs(childFiberRefs: FiberRefs): Effect<never, never, void> {
  return Effect.updateFiberRefs((parentFiberId, parentFiberRefs) =>
    parentFiberRefs.joinAs(parentFiberId, childFiberRefs)
  )
}
