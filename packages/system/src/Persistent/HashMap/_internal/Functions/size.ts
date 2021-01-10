// copyright https://github.com/frptools

import type { HashMap } from "../HashMap"

/**
 * Gets the number of entries in the map
 */
export function size(map: HashMap<any, any>): number {
  return map._size
}
