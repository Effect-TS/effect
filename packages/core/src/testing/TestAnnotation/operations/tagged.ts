/**
 * An annotation which tags tests with strings.
 *
 * @tsplus static effect/core/testing/TestAnnotation.Ops tagged
 */
export const tagged: TestAnnotation<HashSet<string>> = new TestAnnotation(
  "tagged",
  HashSet.empty(),
  (a, b) => a.union(b),
  Tag<HashSet<string>>()
)
