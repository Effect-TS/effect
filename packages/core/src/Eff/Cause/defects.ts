import { pipe } from "../../Function"
import * as O from "../../Option"

import { Cause } from "./cause"
import { foldLeft } from "./foldLeft"

/**
 * Extracts a list of non-recoverable errors from the `Cause`.
 */
export const defects = <E>(cause: Cause<E>): readonly unknown[] =>
  pipe(
    cause,
    foldLeft<readonly unknown[]>([])((a, c) =>
      c._tag === "Die" ? O.some([...a, c.value]) : O.none
    )
  )
