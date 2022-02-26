import { Managed } from "../../Managed"
import { Ref } from "../definition"

/**
 * Creates a new managed `XRef` with the specified value.
 *
 * @tsplus static ets/XRef makeManaged
 */
export function makeManaged<A>(
  value: A,
  __tsplusTrace?: string
): Managed<unknown, never, Ref<A>> {
  return Managed.fromEffect(Ref.make(value))
}
