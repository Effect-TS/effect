import { strictEqual } from "../Eq"

import { compare } from "./compare"
import type { Ord } from "./ord"

export const ordBoolean: Ord<boolean> = {
  equals: strictEqual,
  compare
}
