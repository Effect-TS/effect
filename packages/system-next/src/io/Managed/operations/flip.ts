import { Managed } from "../definition"

/**
 * Flip the error and result.
 *
 * @tsplus fluent ets/Managed flip
 */
export function flip<R, E, A>(
  self: Managed<R, E, A>,
  __etsTrace?: string
): Managed<R, A, E> {
  return self.foldManaged(Managed.succeedNow, Managed.failNow)
}
