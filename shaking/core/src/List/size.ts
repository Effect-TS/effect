import type { List } from "./common"
import { isCons } from "./isCons"

/**
 * Get the size of a list.
 *
 * This has pathologically bad performance.
 * @param list
 */
export function size(list: List<unknown>): number {
  let ct = 0
  let iter = list
  while (isCons(iter)) {
    ct++
    iter = iter.tail
  }
  return ct
}
