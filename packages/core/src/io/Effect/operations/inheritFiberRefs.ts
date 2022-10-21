/**
 * Inherits values from all [[FiberRef]] instances into current fiber.
 *
 * @tsplus static effect/core/io/Effect.Ops inheritFiberRefs
 */
export function inheritFiberRefs(childFiberRefs: FiberRefs) {
  return Effect.updateFiberRefs((parentFiberId, parentFiberRefs) =>
    parentFiberRefs.joinAs(parentFiberId, childFiberRefs)
  )
}
