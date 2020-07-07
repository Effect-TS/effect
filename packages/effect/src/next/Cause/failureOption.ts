import { pipe } from "../../Function"
import * as O from "../../Option"

import { Cause } from "./cause"
import { find } from "./find"

/**
 * Returns the `E` associated with the first `Fail` in this `Cause` if one
 * exists.
 */
export const failureOption = <E>(cause: Cause<E>) =>
  pipe(
    cause,
    find((c) => (c._tag === "Fail" ? O.some(c.value) : O.none))
  )
