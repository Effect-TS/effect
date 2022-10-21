/**
 * Returns a set of all fibers in this test.
 *
 * @tsplus static effect/core/testing/Annotations.Ops supervisedFibers
 */
export const supervisedFibers: Effect<
  Annotations,
  never,
  SortedSet<Fiber.Runtime<unknown, unknown>>
> = Effect.serviceWithEffect(
  Annotations.Tag,
  (annotations) => annotations.supervisedFibers
)
