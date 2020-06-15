import { FiberID } from "../Fiber/id"

import { Cause } from "./cause"

/**
 * Folds over a cause
 */
export const fold = <E, Z>(
  empty: () => Z,
  failCase: (_: E) => Z,
  dieCase: (_: unknown) => Z,
  interruptCase: (_: FiberID) => Z,
  thenCase: (_: Z, __: Z) => Z,
  bothCase: (_: Z, __: Z) => Z
) => (cause: Cause<E>): Z => {
  switch (cause._tag) {
    case "Empty": {
      return empty()
    }
    case "Fail": {
      return failCase(cause.value)
    }
    case "Die": {
      return dieCase(cause.value)
    }
    case "Interrupt": {
      return interruptCase(cause.fiberId)
    }
    case "Both": {
      return bothCase(
        fold(empty, failCase, dieCase, interruptCase, thenCase, bothCase)(cause.left),
        fold(empty, failCase, dieCase, interruptCase, thenCase, bothCase)(cause.right)
      )
    }
    case "Then": {
      return thenCase(
        fold(empty, failCase, dieCase, interruptCase, thenCase, bothCase)(cause.left),
        fold(empty, failCase, dieCase, interruptCase, thenCase, bothCase)(cause.right)
      )
    }
  }
}
