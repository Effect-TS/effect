import { strictEqual } from "../Eq"

import { compare } from "./compare"
import { Ord } from "./ord"

export const ordNumber: Ord<number> = {
  equals: strictEqual,
  compare
}
