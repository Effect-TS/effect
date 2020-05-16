import type { Tree } from "./Tree"
import { drawForest } from "./drawForest"

/**
 * Neat 2-dimensional drawing of a tree
 *
 * @example
 * import { make, drawTree, tree } from 'fp-ts/lib/Tree'
 *
 * const fa = make('a', [
 *   tree.of('b'),
 *   tree.of('c'),
 *   make('d', [tree.of('e'), tree.of('f')])
 * ])
 *
 * assert.strictEqual(drawTree(fa), `a
 * ├─ b
 * ├─ c
 * └─ d
 *    ├─ e
 *    └─ f`)
 *
 *
 * @since 2.0.0
 */
export function drawTree(tree: Tree<string>): string {
  return tree.value + drawForest(tree.forest)
}
