import { strictEqual } from "../Eq/strictEqual"

import { Ord } from "./Ord"
import { compare } from "./compare"
/**
 * @since 2.0.0
 */
export const ordBoolean: Ord<boolean> = {
  equals: strictEqual,
  compare
}
