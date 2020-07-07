import * as O from "../../Option"

import { Cause, Then, Both } from "./cause"

/**
 * Remove all `Fail` and `Interrupt` nodes from this `Cause`,
 * return only `Die` cause/finalizer defects.
 */
export const keepDefects = <E>(cause: Cause<E>): O.Option<Cause<never>> => {
  switch (cause._tag) {
    case "Empty": {
      return O.none
    }
    case "Fail": {
      return O.none
    }
    case "Interrupt": {
      return O.none
    }
    case "Die": {
      return O.some(cause)
    }
    case "Then": {
      const lefts = keepDefects(cause.left)
      const rights = keepDefects(cause.right)

      if (lefts._tag === "Some" && rights._tag === "Some") {
        return O.some(Then(lefts.value, rights.value))
      } else if (lefts._tag === "Some") {
        return lefts
      } else if (rights._tag === "Some") {
        return rights
      } else {
        return O.none
      }
    }
    case "Both": {
      const lefts = keepDefects(cause.left)
      const rights = keepDefects(cause.right)

      if (lefts._tag === "Some" && rights._tag === "Some") {
        return O.some(Both(lefts.value, rights.value))
      } else if (lefts._tag === "Some") {
        return lefts
      } else if (rights._tag === "Some") {
        return rights
      } else {
        return O.none
      }
    }
  }
}
