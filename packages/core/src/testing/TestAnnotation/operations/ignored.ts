import { Tag } from "@fp-ts/data/Context"

/**
 * An annotation which counts ignored tests.
 *
 * @tsplus static effect/core/testing/TestAnnotation.Ops ignored
 * @category constructors
 * @since 1.0.0
 */
export const ignored: TestAnnotation<number> = new TestAnnotation(
  "ignored",
  0,
  (a, b) => a + b,
  Tag<number>()
)
