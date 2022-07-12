/**
 * An annotation which counts ignored tests.
 *
 * @tsplus static effect/core/testing/TestAnnotation.Ops ignored
 */
export const ignored: TestAnnotation<number> = new TestAnnotation(
  "ignored",
  0,
  (a, b) => a + b,
  Tag<number>()
)
