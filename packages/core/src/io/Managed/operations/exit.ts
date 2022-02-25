import { Exit } from "../../Exit"
import { Managed } from "../definition"

/**
 * Returns an effect that semantically runs the effect on a fiber, producing
 * an `Exit` for the completion value of the fiber.
 *
 * @tsplus fluent ets/Managed exit
 */
export function exit<R, E, A>(
  self: Managed<R, E, A>,
  __tsplusTrace?: string
): Managed<R, never, Exit<E, A>> {
  return self.foldCauseManaged(
    (cause) => Managed.succeedNow(Exit.failCause(cause)),
    (a) => Managed.succeedNow(Exit.succeed(a))
  )
}
