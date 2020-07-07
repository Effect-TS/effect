import * as C from "../Cause"

import { Exit } from "./exit"
import { halt } from "./halt"

/**
 * Maps over the cause type.
 */
export const mapErrorCause = <E, E1>(f: (e: C.Cause<E>) => C.Cause<E1>) => <A>(
  exit: Exit<E, A>
): Exit<E1, A> => {
  switch (exit._tag) {
    case "Failure": {
      return halt(f(exit.cause))
    }
    case "Success": {
      return exit
    }
  }
}
