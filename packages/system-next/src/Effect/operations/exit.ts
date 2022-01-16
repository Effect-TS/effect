// ets_tracing: off

import * as Ex from "../../Exit"
import type { Effect, RIO } from "../definition"
import { IFold } from "../definition"
import { succeedNow } from "./succeedNow"

/**
 * Returns an effect that semantically runs the effect on a fiber, producing
 * an `Exit` for the completion value of the fiber.
 */
export function exit<R, E, A>(
  self: Effect<R, E, A>,
  __trace?: string
): RIO<R, Ex.Exit<E, A>> {
  return new IFold(
    self,
    (cause) => succeedNow(Ex.failCause(cause)),
    (success) => succeedNow(Ex.succeed(success)),
    __trace
  )
}
