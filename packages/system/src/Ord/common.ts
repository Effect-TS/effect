import type { Ordering } from "../Ordering"
import type { Ord } from "./definition"
import { contramap_, fromCompare } from "./operations"

const compare = (y: any): ((x: any) => Ordering) => {
  return (x) => (x < y ? -1 : x > y ? 1 : 0)
}

export const boolean: Ord<boolean> = fromCompare(compare)

export const number: Ord<number> = fromCompare(compare)

export const date: Ord<Date> = contramap_(number, (date: Date) => date.valueOf())

export const string: Ord<string> = fromCompare(compare)
