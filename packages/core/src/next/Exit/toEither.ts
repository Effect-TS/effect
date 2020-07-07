import * as E from "../../Either"
import { FiberFailure } from "../Errors"

import { Exit } from "./exit"

/**
 * Converts the `Exit` to an `Either<FiberFailure, A>`, by wrapping the
 * cause in `FiberFailure` (if the result is failed).
 */
export const toEither = <E, A>(exit: Exit<E, A>): E.Either<FiberFailure<E>, A> => {
  switch (exit._tag) {
    case "Success": {
      return E.right(exit.value)
    }
    case "Failure": {
      return E.left(new FiberFailure(exit.cause))
    }
  }
}
