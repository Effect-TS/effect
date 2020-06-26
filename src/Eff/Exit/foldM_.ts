import * as C from "../Cause"
import { Effect } from "../Effect/effect"

import { Exit } from "./exit"

/**
 * Folds over the value or cause.
 */
export const foldM_ = <E, A, S1, R1, E1, A1, S2, R2, E2, A2>(
  exit: Exit<E, A>,
  failed: (e: C.Cause<E>) => Effect<S1, R1, E1, A1>,
  succeed: (a: A) => Effect<S2, R2, E2, A2>
): Effect<S1 | S2, R1 & R2, E1 | E2, A1 | A2> => {
  switch (exit._tag) {
    case "Success": {
      return succeed(exit.value)
    }
    case "Failure": {
      return failed(exit.cause)
    }
  }
}
