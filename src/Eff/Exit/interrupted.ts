import * as C from "../Cause"

import { Failure, Exit } from "./exit"

/**
 * Returns if Exit contains an interruption state
 */
export const interrupted = <E, A>(exit: Exit<E, A>): exit is Failure<E> => {
  switch (exit._tag) {
    case "Success": {
      return false
    }
    case "Failure": {
      return C.interrupted(exit.cause)
    }
  }
}
