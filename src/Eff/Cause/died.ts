import { pipe } from "../../Function"
import * as O from "../../Option"

import { Cause } from "./cause"
import { dieOption } from "./dieOption"

/**
 * Returns if a cause contains a defect
 */
export const died = <E>(cause: Cause<E>) =>
  pipe(
    cause,
    dieOption,
    O.map(() => true),
    O.getOrElse(() => false)
  )
