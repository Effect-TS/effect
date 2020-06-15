import * as O from "../../Option"

import { Cause } from "./cause"

/**
 * Accumulates a state over a Cause
 */
export const foldLeft = <Z>(z: Z) => <E>(
  f: (z: Z, cause: Cause<E>) => O.Option<Z>
): ((cause: Cause<E>) => Z) => {
  return (cause) => {
    const apply = O.getOrElse_(f(z, cause), () => z)

    switch (cause._tag) {
      case "Then": {
        return foldLeft(foldLeft(apply)(f)(cause.left))(f)(cause.right)
      }
      case "Both": {
        return foldLeft(foldLeft(apply)(f)(cause.left))(f)(cause.right)
      }
      default: {
        return apply
      }
    }
  }
}
