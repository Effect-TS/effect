/**
 * An annotation which counts repeated tests.
 *
 * @tsplus static effect/core/testing/TestAnnotation.Ops repeated
 */
export const repeated: TestAnnotation<number> = new TestAnnotation(
  "repeated",
  0,
  (a, b) => a + b,
  Tag<number>()
)
