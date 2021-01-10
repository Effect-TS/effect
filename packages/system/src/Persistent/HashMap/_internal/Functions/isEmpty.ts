// copyright https://github.com/frptools

import type { HashMap } from "../HashMap"

/**
 * Checks if the map is empty
 */
export function isEmpty(map: HashMap<any, any>): boolean {
  return map._size === 0
}
