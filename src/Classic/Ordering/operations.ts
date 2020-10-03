import { pipe } from "@effect-ts/system/Function"

import { Ordering } from "./definition"

export function toNumber(o: Ordering) {
  return pipe(Ordering.unwrap(o), (o) => {
    switch (o) {
      case "eq": {
        return 0
      }
      case "gt": {
        return 1
      }
      case "lt": {
        return -1
      }
    }
  })
}

export function fromNumber(n: number) {
  if (n < 0) {
    return Ordering.wrap("lt")
  }
  if (n > 0) {
    return Ordering.wrap("gt")
  }
  if (n === 0) {
    return Ordering.wrap("eq")
  }
}
