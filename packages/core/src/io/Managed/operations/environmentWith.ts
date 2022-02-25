import { Managed } from "../definition"

/**
 * Create a managed that accesses the environment.
 *
 * @tsplus static ets/ManagedOps environmentWith
 */
export function environmentWith<R0, A>(
  f: (_: R0) => A,
  __tsplusTrace?: string
): Managed<R0, never, A> {
  return Managed.environment<R0>().map(f)
}
