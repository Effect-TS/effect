import * as C from "../Cause"

import { Exit } from "./exit"
import { halt } from "./halt"

/**
 * Maps over the error type.
 */
export const mapError = <E, E1>(f: (e: E) => E1) => <A>(
  exit: Exit<E, A>
): Exit<E1, A> => {
  switch (exit._tag) {
    case "Failure": {
      return halt(C.map(f)(exit.cause))
    }
    case "Success": {
      return exit
    }
  }
}
