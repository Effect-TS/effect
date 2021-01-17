import { Ordering } from "../Ordering"
import type { Ord } from "./definition"
import { contramap_, fromCompare } from "./operations"

const compare = (y: any): ((x: any) => Ordering) => {
  return (x) =>
    x < y ? Ordering.wrap("lt") : x > y ? Ordering.wrap("gt") : Ordering.wrap("eq")
}

export const ordBoolean: Ord<boolean> = fromCompare(compare)

export const ordNumber: Ord<number> = fromCompare(compare)

export const ordDate: Ord<Date> = contramap_(ordNumber, (date: Date) => date.valueOf())

export const ordString: Ord<string> = fromCompare(compare)
