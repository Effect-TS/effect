import type { Tree } from "./Tree"
import { unfoldForest } from "./unfoldForest"

/**
 * Build a tree from a seed value
 *
 * @since 2.0.0
 */
export function unfoldTree<A, B>(b: B, f: (b: B) => [A, Array<B>]): Tree<A> {
  const [a, bs] = f(b)
  return { value: a, forest: unfoldForest(bs, f) }
}
