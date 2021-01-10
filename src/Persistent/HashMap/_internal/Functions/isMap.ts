// copyright https://github.com/frptools

import type { HashMap } from "../HashMap"
import { isHashMap } from "../HashMap"

/**
 * Checks if the argument is a map
 */
export function isMap(arg: any): arg is HashMap<unknown, unknown> {
  return isHashMap(arg)
}
