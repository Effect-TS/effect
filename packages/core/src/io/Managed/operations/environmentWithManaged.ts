import { Managed } from "../definition"

/**
 * Create a managed that accesses the environment.
 *
 * @tsplus static ets/ManagedOps environmentWithManaged
 */
export function environmentWithManaged<R0, R, E, A>(
  f: (_: R0) => Managed<R, E, A>,
  __tsplusTrace?: string
): Managed<R & R0, E, A> {
  return Managed.environment<R0>().flatMap(f)
}
