import { pipe } from "../../Function"
import * as O from "../../Option"

import { Cause } from "./cause"
import { find } from "./find"

/**
 * Determines if the `Cause` contains only interruptions and not any `Die` or
 * `Fail` causes.
 */
export const interruptedOnly = <E>(cause: Cause<E>) =>
  pipe(
    cause,
    find((c) => (c._tag === "Die" || c._tag === "Fail" ? O.some(false) : O.none)),
    O.getOrElse(() => true)
  )
