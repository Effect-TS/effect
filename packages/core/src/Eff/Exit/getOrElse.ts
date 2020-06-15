import * as C from "../Cause"

import { Exit } from "./exit"

/**
 * Get successful result falling back to orElse result in case of failure
 */
export const getOrElse = <E, A1>(orElse: (_: C.Cause<E>) => A1) => <A>(
  exit: Exit<E, A>
): A | A1 => {
  switch (exit._tag) {
    case "Success": {
      return exit.value
    }
    case "Failure": {
      return orElse(exit.cause)
    }
  }
}
