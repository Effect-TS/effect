import { pipe } from "../../Function"

import { FiberRef } from "./fiberRef"
import { modify } from "./modify"

/**
 * Reads the value associated with the current fiber. Returns initial value if
 * no value was `set` or inherited from parent.
 */
export const get = <A>(fiberRef: FiberRef<A>) =>
  pipe(
    fiberRef,
    modify((a) => [a, a])
  )
