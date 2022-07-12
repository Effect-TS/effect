/**
 * An annotation which counts retried tests.
 *
 * @tsplus static effect/core/testing/TestAnnotation.Ops retried
 */
export const retried: TestAnnotation<number> = new TestAnnotation(
  "retried",
  0,
  (a, b) => a + b,
  Tag<number>()
)
