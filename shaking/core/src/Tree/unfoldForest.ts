import type { Forest } from "./Tree"
import { unfoldTree } from "./unfoldTree"

/**
 * Build a tree from a seed value
 *
 * @since 2.0.0
 */
export function unfoldForest<A, B>(
  bs: Array<B>,
  f: (b: B) => [A, Array<B>]
): Forest<A> {
  return bs.map((b) => unfoldTree(b, f))
}
