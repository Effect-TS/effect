/**
 * @tsplus static effect/core/testing/TestAnnotation.Ops fibers
 */
export const fibers: TestAnnotation<
  Either<number, Chunk<AtomicReference<SortedSet<Fiber.Runtime<unknown, unknown>>>>>
> = new TestAnnotation(
  "fibers",
  Either.left(0),
  TestAnnotation.compose,
  Tag<Either<number, Chunk<AtomicReference<SortedSet<Fiber.Runtime<unknown, unknown>>>>>>()
)
