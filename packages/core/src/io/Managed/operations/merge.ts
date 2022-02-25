import { Managed } from "../definition"

/**
 * Returns a new effect where the error channel has been merged into the
 * success channel to their common combined type.
 *
 * @tsplus fluent ets/Managed merge
 */
export function merge<R, E, A>(
  self: Managed<R, E, A>,
  __tsplusTrace?: string
): Managed<R, never, E | A> {
  return self.foldManaged(Managed.succeedNow, Managed.succeedNow)
}
