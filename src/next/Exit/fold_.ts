import * as C from "../Cause"

import { Exit } from "./exit"

/**
 * Folds over the value or cause.
 */
export const fold_ = <E, A, Z>(
  exit: Exit<E, A>,
  failed: (e: C.Cause<E>) => Z,
  succeed: (a: A) => Z
): Z => {
  switch (exit._tag) {
    case "Success": {
      return succeed(exit.value)
    }
    case "Failure": {
      return failed(exit.cause)
    }
  }
}
