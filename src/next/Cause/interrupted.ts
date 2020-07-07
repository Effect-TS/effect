import { pipe } from "../../Function"
import * as O from "../../Option"

import { Cause } from "./cause"
import { interruptOption } from "./interruptOption"

/**
 * Returns if the cause contains an interruption in it
 */
export const interrupted = <E>(cause: Cause<E>) =>
  pipe(
    cause,
    interruptOption,
    O.map(() => true),
    O.getOrElse(() => false)
  )
