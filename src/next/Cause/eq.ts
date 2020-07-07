import { Eq } from "../../Eq"
import { EqFiberID } from "../Fiber/id"

import { Cause } from "./cause"

/**
 * Checks Equality for a Cause
 */
export const EqCause = <E>(): Eq<Cause<E>> => ({
  equals: causeEq
})

function causeEq<E>(x: Cause<E>, y: Cause<E>): boolean {
  switch (x._tag) {
    case "Fail": {
      return y._tag === "Fail" && x.value === y.value
    }
    case "Empty": {
      return y._tag === "Empty"
    }
    case "Die": {
      return (
        y._tag === "Die" &&
        ((x.value instanceof Error &&
          y.value instanceof Error &&
          x.value.name === y.value.name &&
          x.value.message === y.value.message) ||
          x.value === y.value)
      )
    }
    case "Interrupt": {
      return y._tag === "Interrupt" && EqFiberID.equals(x.fiberId, y.fiberId)
    }
    case "Both": {
      return y._tag === "Both" && causeEq(x.left, y.left) && causeEq(x.right, y.right)
    }
    case "Then": {
      return y._tag === "Then" && causeEq(x.left, y.left) && causeEq(x.right, y.right)
    }
  }
}
