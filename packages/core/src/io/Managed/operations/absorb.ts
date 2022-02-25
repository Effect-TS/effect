import type { Managed } from "../definition"

/**
 * Attempts to convert defects into a failure, throwing away all information
 * about the cause of the failure.
 *
 * @tsplus fluent ets/Managed absorb
 */
export function absorb<R, E, A>(
  self: Managed<R, E, A>,
  f: (e: E) => unknown,
  __tsplusTrace?: string
): Managed<R, unknown, A> {
  return self.absorbWith(f)
}
