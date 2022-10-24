import { Tag } from "@fp-ts/data/Context"
import { pipe } from "@fp-ts/data/Function"
import * as HashSet from "@fp-ts/data/HashSet"

/**
 * An annotation which tags tests with strings.
 *
 * @tsplus static effect/core/testing/TestAnnotation.Ops tagged
 * @category constructors
 * @since 1.0.0
 */
export const tagged: TestAnnotation<HashSet.HashSet<string>> = new TestAnnotation(
  "tagged",
  HashSet.empty(),
  (a, b) => pipe(a, HashSet.union(b)),
  Tag<HashSet.HashSet<string>>()
)
