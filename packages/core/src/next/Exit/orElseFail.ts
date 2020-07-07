import { pipe } from "../../Function"

import { Exit } from "./exit"
import { mapError } from "./mapError"

/**
 * Replaces the error value with the one provided.
 */
export const orElseFail = <E1>(e: E1) => <E, A>(exit: Exit<E, A>) =>
  pipe(
    exit,
    mapError(() => e)
  )
