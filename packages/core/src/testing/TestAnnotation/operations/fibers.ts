import type { Chunk } from "@fp-ts/data/Chunk"
import { Tag } from "@fp-ts/data/Context"
import type { Either } from "@fp-ts/data/Either"
import { left } from "@fp-ts/data/Either"
import type { MutableRef } from "@fp-ts/data/mutable/MutableRef"
import type { SortedSet } from "@fp-ts/data/SortedSet"

/**
 * @tsplus static effect/core/testing/TestAnnotation.Ops fibers
 * @category constructors
 * @since 1.0.0
 */
export const fibers: TestAnnotation<
  Either<
    number,
    Chunk<MutableRef<SortedSet<Fiber.Runtime<unknown, unknown>>>>
  >
> = new TestAnnotation(
  "fibers",
  left(0) as Either<number, Chunk<MutableRef<SortedSet<Fiber.Runtime<unknown, unknown>>>>>,
  TestAnnotation.compose,
  Tag<Either<number, Chunk<MutableRef<SortedSet<Fiber.Runtime<unknown, unknown>>>>>>()
)
