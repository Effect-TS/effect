import { pipe } from "../../Function"
import * as O from "../../Option"

import { Cause } from "./cause"
import { find } from "./find"

/**
 * Returns the `FiberID` associated with the first `Interrupt` in this `Cause` if one
 * exists.
 */
export const interruptOption = <E>(cause: Cause<E>) =>
  pipe(
    cause,
    find((c) => (c._tag === "Interrupt" ? O.some(c.fiberId) : O.none))
  )
