// ets_tracing: off

import type { Ordering } from "../Ordering"
import type { Ord } from "./definition"
import { contramap_, makeOrd } from "./operations"

const compare = (x: any, y: any): Ordering => {
  return x < y ? -1 : x > y ? 1 : 0
}

export const boolean: Ord<boolean> = makeOrd(compare)

export const number: Ord<number> = makeOrd(compare)

export const date: Ord<Date> = contramap_(number, (date: Date) => date.valueOf())

export const string: Ord<string> = makeOrd(compare)
