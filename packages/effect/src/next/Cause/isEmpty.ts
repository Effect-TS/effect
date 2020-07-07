import { introduce, pipe } from "../../Function"
import * as O from "../../Option"

import { Cause, Empty } from "./cause"
import { EqCause } from "./eq"
import { foldLeft } from "./foldLeft"

/**
 * Determines if the `Cause` is empty.
 */
export const isEmpty = <E>(cause: Cause<E>) =>
  introduce(EqCause<E>().equals)(
    (eq) =>
      eq(cause, Empty) ||
      pipe(
        cause,
        foldLeft(true)((acc, c) => {
          switch (c._tag) {
            case "Empty": {
              return O.some(acc)
            }
            case "Die": {
              return O.some(false)
            }
            case "Fail": {
              return O.some(false)
            }
            case "Interrupt": {
              return O.some(false)
            }
            default: {
              return O.none
            }
          }
        })
      )
  )
