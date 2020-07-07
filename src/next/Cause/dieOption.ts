import { pipe } from "../../Function"
import * as O from "../../Option"

import { Cause } from "./cause"
import { find } from "./find"

/**
 * Returns the `Error` associated with the first `Die` in this `Cause` if
 * one exists.
 */
export const dieOption = <E>(cause: Cause<E>) =>
  pipe(
    cause,
    find((c) => (c._tag === "Die" ? O.some(c.value) : O.none))
  )
