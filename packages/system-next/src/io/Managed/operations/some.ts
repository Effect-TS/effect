import * as O from "../../../data/Option"
import { Managed } from "../definition"

/**
 * Returns a `Managed` with the optional value.
 *
 * @ets static ets/ManagedOps some
 */
export function some<A>(
  value: A,
  __etsTrace?: string
): Managed<unknown, never, O.Option<A>> {
  return Managed.succeed(O.some(value))
}
