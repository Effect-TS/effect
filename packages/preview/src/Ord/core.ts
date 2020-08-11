import { fromCompare } from "../_abstract/Ord"
import { Ordering } from "../_abstract/Ordering"

export const ordNumber = fromCompare<number>((y) => (x) =>
  x < y ? Ordering.wrap("lt") : x === y ? Ordering.wrap("eq") : Ordering.wrap("gt")
)
