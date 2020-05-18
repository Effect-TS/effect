import { strictEqual } from "../Eq"

import { compare } from "./compare"
import { Ord } from "./ord"

export const ordString: Ord<string> = {
  equals: strictEqual,
  compare
}
