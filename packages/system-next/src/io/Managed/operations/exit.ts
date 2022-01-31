import type { Exit } from "../../Exit"
import { failCause as exitFailCause } from "../../Exit/operations/failCause"
import { succeed as exitSucceed } from "../../Exit/operations/succeed"
import { Managed } from "../definition"

/**
 * Returns an effect that semantically runs the effect on a fiber, producing
 * an `Exit` for the completion value of the fiber.
 *
 * @tsplus fluent ets/Managed exit
 */
export function exit<R, E, A>(
  self: Managed<R, E, A>,
  __trace?: string
): Managed<R, never, Exit<E, A>> {
  return self.foldCauseManaged(
    (cause) => Managed.succeedNow(exitFailCause(cause)),
    (a) => Managed.succeedNow(exitSucceed(a))
  )
}
