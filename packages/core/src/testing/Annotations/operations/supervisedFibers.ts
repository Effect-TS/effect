import type { SortedSet } from "@fp-ts/data/SortedSet"

/**
 * Returns a set of all fibers in this test.
 *
 * @tsplus static effect/core/testing/Annotations.Ops supervisedFibers
 * @category getters
 * @since 1.0.0
 */
export const supervisedFibers: Effect<
  Annotations,
  never,
  SortedSet<Fiber.Runtime<unknown, unknown>>
> = Effect.serviceWithEffect(
  Annotations.Tag,
  (annotations) => annotations.supervisedFibers
)
