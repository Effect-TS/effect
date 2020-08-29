import { pipe } from "@effect-ts/system/Function"

import { Ordering } from "./definition"

export const toNumber = (o: Ordering) =>
  pipe(Ordering.unwrap(o), (o) => {
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
