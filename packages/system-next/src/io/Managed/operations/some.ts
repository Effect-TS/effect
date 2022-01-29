import type { LazyArg } from "../../../data/Function"
import { Option } from "../../../data/Option"
import { Managed } from "../definition"

/**
 * Returns a `Managed` with the optional value.
 *
 * @ets static ets/ManagedOps some
 */
export function some<A>(
  value: LazyArg<A>,
  __etsTrace?: string
): Managed<unknown, never, Option<A>> {
  return Managed.succeed(Option.some(value()))
}
