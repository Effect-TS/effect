import { introduce, pipe } from "../../Function"
import * as O from "../../Option"

import { Cause } from "./cause"
import { EqCause } from "./eq"
import { foldLeft } from "./foldLeft"

/**
 * Determines if this cause contains or is equal to the specified cause.
 */
export const contains = <E, E1 extends E = E>(that: Cause<E1>) => (cause: Cause<E>) =>
  introduce(EqCause<E>().equals)(
    (eq) =>
      eq(that, cause) ||
      pipe(
        cause,
        foldLeft(false)((_, c) => (eq(that, c) ? O.some(true) : O.none))
      )
  )
