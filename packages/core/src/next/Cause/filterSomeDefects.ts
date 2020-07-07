import * as O from "../../Option"

import { Cause, Then, Both } from "./cause"

/**
 * Filter out all `Die` causes according to the specified function,
 * returning `Some` with the remaining causes or `None` if there are no
 * remaining causes.
 */
export const filterSomeDefects = (f: (_: unknown) => boolean) => <E>(
  cause: Cause<E>
): O.Option<Cause<E>> => {
  switch (cause._tag) {
    case "Empty": {
      return O.none
    }
    case "Interrupt": {
      return O.some(cause)
    }
    case "Fail": {
      return O.some(cause)
    }
    case "Die": {
      return f(cause.value) ? O.some(cause) : O.none
    }
    case "Both": {
      const left = filterSomeDefects(f)(cause.left)
      const right = filterSomeDefects(f)(cause.right)

      if (left._tag === "Some" && right._tag === "Some") {
        return O.some(Both(left.value, right.value))
      } else if (left._tag === "Some") {
        return left
      } else if (right._tag === "Some") {
        return right
      } else {
        return O.none
      }
    }
    case "Then": {
      const left = filterSomeDefects(f)(cause.left)
      const right = filterSomeDefects(f)(cause.right)

      if (left._tag === "Some" && right._tag === "Some") {
        return O.some(Then(left.value, right.value))
      } else if (left._tag === "Some") {
        return left
      } else if (right._tag === "Some") {
        return right
      } else {
        return O.none
      }
    }
  }
}
