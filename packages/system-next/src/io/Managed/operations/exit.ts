import type { Managed } from "../definition"
import * as Ex from "./_internal/exit"
import { foldCauseManaged_ } from "./foldCauseManaged"
import { succeedNow } from "./succeedNow"

/**
 * Returns an effect that semantically runs the effect on a fiber, producing
 * an `Exit` for the completion value of the fiber.
 */
export function exit<R, E, A>(
  self: Managed<R, E, A>,
  __trace?: string
): Managed<R, never, Ex.Exit<E, A>> {
  return foldCauseManaged_(
    self,
    (cause) => succeedNow(Ex.failCause(cause)),
    (a) => succeedNow(Ex.succeed(a)),
    __trace
  )
}
