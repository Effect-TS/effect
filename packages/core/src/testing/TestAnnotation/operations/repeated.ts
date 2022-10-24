import { Tag } from "@fp-ts/data/Context"

/**
 * An annotation which counts repeated tests.
 *
 * @tsplus static effect/core/testing/TestAnnotation.Ops repeated
 * @category constructors
 * @since 1.0.0
 */
export const repeated: TestAnnotation<number> = new TestAnnotation(
  "repeated",
  0,
  (a, b) => a + b,
  Tag<number>()
)
