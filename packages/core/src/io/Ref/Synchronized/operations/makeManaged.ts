import type { LazyArg } from "../../../../data/Function"
import type { Managed } from "../../../Managed"
import { Synchronized } from "../definition"

/**
 * Creates a new `XRef.Synchronized` with the specified value in the context
 * of a `Managed.`
 *
 * @tsplus static ets/XSynchronizedOps makeManaged
 */
export function makeManaged<A>(
  value: LazyArg<A>,
  __tsplusTrace?: string
): Managed<unknown, never, Synchronized<A>> {
  return Synchronized.make(value).toManaged()
}
