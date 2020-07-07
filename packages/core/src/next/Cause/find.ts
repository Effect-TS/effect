import * as O from "../../Option"

import { Cause } from "./cause"

/**
 * Finds the first result matching f
 */
export const find = <Z, E>(
  f: (cause: Cause<E>) => O.Option<Z>
): ((cause: Cause<E>) => O.Option<Z>) => {
  return (cause) => {
    const apply = f(cause)

    if (apply._tag === "Some") {
      return apply
    }

    switch (cause._tag) {
      case "Then": {
        const isLeft = find(f)(cause.left)
        if (isLeft._tag === "Some") {
          return isLeft
        } else {
          return find(f)(cause.right)
        }
      }
      case "Both": {
        const isLeft = find(f)(cause.left)
        if (isLeft._tag === "Some") {
          return isLeft
        } else {
          return find(f)(cause.right)
        }
      }
      default: {
        return apply
      }
    }
  }
}
