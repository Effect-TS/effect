import { pipe } from "../../Function"
import * as O from "../../Option"
import * as S from "../../Set"
import { FiberID, EqFiberID } from "../Fiber/id"

import { Cause } from "./cause"
import { foldLeft } from "./foldLeft"

/**
 * Returns a set of interruptors, fibers that interrupted the fiber described
 * by this `Cause`.
 */
export const interruptors = <E>(cause: Cause<E>) =>
  pipe(
    cause,
    foldLeft<S.Set<FiberID>>(S.empty)((s, c) =>
      c._tag === "Interrupt" ? O.some(S.insert_(EqFiberID)(s, c.fiberId)) : O.none
    )
  )
