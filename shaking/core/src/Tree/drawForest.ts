import type { Forest } from "./Tree"
import { draw } from "./draw"

/**
 * Neat 2-dimensional drawing of a forest
 *
 * @since 2.0.0
 */
export function drawForest(forest: Forest<string>): string {
  return draw("\n", forest)
}
