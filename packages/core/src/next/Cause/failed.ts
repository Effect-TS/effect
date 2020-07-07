import { pipe } from "../../Function"
import * as O from "../../Option"

import { Cause } from "./cause"
import { failureOption } from "./failureOption"

/**
 * Returns if the cause has a failure in it
 */
export const failed = <E>(cause: Cause<E>) =>
  pipe(
    cause,
    failureOption,
    O.map(() => true),
    O.getOrElse(() => false)
  )
