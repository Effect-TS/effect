import { strictEqual } from "../Eq/strictEqual"

import type { Ord } from "./Ord"
import { compare } from "./compare"

/**
 * @since 2.0.0
 */
export const ordString: Ord<string> = {
  equals: strictEqual,
  compare
}
