import { pipe } from "../../Function"
import * as O from "../../Option"

import { Cause } from "./cause"
import { foldLeft } from "./foldLeft"

/**
 * Produces a list of all recoverable errors `E` in the `Cause`.
 */
export const failures = <E>(cause: Cause<E>) =>
  pipe(
    cause,
    foldLeft<readonly E[]>([])((a, c) =>
      c._tag === "Fail" ? O.some([...a, c.value]) : O.none
    )
  )
