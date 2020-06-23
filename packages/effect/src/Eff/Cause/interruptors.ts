import { pipe } from "../../Function"
import * as O from "../../Option"
import { FiberID } from "../Fiber/id"

import { Cause } from "./cause"
import { foldLeft } from "./foldLeft"

/**
 * Returns a set of interruptors, fibers that interrupted the fiber described
 * by this `Cause`.
 */
export const interruptors = <E>(cause: Cause<E>) =>
  pipe(
    cause,
    foldLeft<Set<FiberID>>(new Set())((s, c) =>
      c._tag === "Interrupt" ? O.some(s.add(c.fiberId)) : O.none
    )
  )
