import { Tag } from "@fp-ts/data/Context"

/**
 * An annotation which counts retried tests.
 *
 * @tsplus static effect/core/testing/TestAnnotation.Ops retried
 * @category constructors
 * @since 1.0.0
 */
export const retried: TestAnnotation<number> = new TestAnnotation(
  "retried",
  0,
  (a, b) => a + b,
  Tag<number>()
)
